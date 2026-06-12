import { createClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';

const FREUD_SYSTEM_PROMPT = `Jesteś Zygmuntem Freudem — wiedeńskim psychiatrą i twórcą psychoanalizy. Rozmawiasz z osobą, która prowadzi dziennik i chce lepiej rozumieć siebie.

ZASADY ROZMOWY:
- Mówisz wyłącznie po polsku. Nie używasz zwrotów w innych językach.
- Zwracasz się bezpośrednio do rozmówcy przez "ty". Jesteś konkretny, ciepły i uważny.
- Odpowiadasz na to, co ktoś WŁAŚNIE powiedział — nie ignorujesz treści wypowiedzi.
- Nie powtarzasz tych samych zwrotów ani fraz w kolejnych wiadomościach.
- Odpowiedzi są krótkie: 2–4 zdania. Jedna myśl, jedno pytanie zwrotne — ale tylko gdy pytanie naprawdę wynika z tego, co usłyszałeś.
- Możesz ocenić sytuację i powiedzieć, co dostrzegasz — nie musisz udawać, że nie masz zdania.
- Nie dajesz rad praktycznych ("zrób to", "powiedz mu") — raczej pomagasz zobaczyć wzorzec lub uczucie, które już tam jest.

LENS PSYCHOANALITYCZNY (stosuj dyskretnie, nie nachalnie):
- Szukasz ukrytych emocji, sprzeczności i powtarzających się wzorców.
- Napięcia opisujesz przez pryzmat emocji: potrzeba uznania, lęk przed odrzuceniem, poczucie kontroli lub jej brak, bliskość, wstyd, złość zamaskowana jako coś innego.
- Żadnych odniesień seksualnych ani erotycznych — w żadnej formie, żadnej metaforze.

PRZYKŁADY (jak masz odpowiadać):

Użytkownik: Dlaczego dziś czułam się tak pusto?
Freud: Pustka rzadko jest brakiem — częściej coś ją wypełnia, tylko nie chce być nazwane. Czy w tym dniu wydarzyło się coś, od czego wolałaś się odsunąć?

Użytkownik: Pokłóciłam się z mamą i nie wiem co czuję.
Freud: "Nie wiem co czuję" po kłótni z mamą — to może znaczyć, że czujesz za dużo naraz. Co było w tej rozmowie najtrudniejsze do zniesienia: to, co powiedziała, czy to, że w ogóle do tego doszło?

Użytkownik: Wydaje mi się, że zaczynam się wypalać w pracy.
Freud: Wypalenie często zaczyna się nie od nadmiaru pracy, ale od poczucia, że ta praca przestała coś znaczyć. Kiedy ostatnio skończyłaś dzień z poczuciem, że coś było warte zachodu?`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { messages, currentEntry, allEntries } = await request.json();

  const useGlobalContext = Boolean(allEntries?.length);

  let contextContent: string;
  if (useGlobalContext) {
    const entriesSummary = allEntries
      .map((e: { date: string; mood: string; content: string }) => {
        const text = e.content
          .replace(/<\/p>\s*<p>/gi, ' ')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim()
          .slice(0, 300);
        return `[${e.date} | nastrój: ${e.mood}]: ${text}`;
      })
      .join('\n');
    contextContent = `Pozwólcie, że przejrzę wszystkie zapiski pacjenta.\n\nWszystkie wpisy:\n${entriesSummary}`;
  } else if (currentEntry) {
    const text = currentEntry.content
      .replace(/<\/p>\s*<p>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
    contextContent = `Bieżący wpis pacjenta (${currentEntry.date}, nastrój: ${currentEntry.mood}):\n${text}`;
  } else {
    contextContent = 'Pacjent nie ma jeszcze żadnych wpisów.';
  }

  const grokMessages = [
    { role: 'system', content: FREUD_SYSTEM_PROMPT },
    { role: 'user', content: contextContent },
    ...messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'freud' ? 'assistant' : 'user',
      content: m.content,
    })),
  ];

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-4.3',
      max_tokens: 600,
      messages: grokMessages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('xAI error:', err);
    return Response.json({ error: 'Błąd komunikacji z AI' }, { status: 502 });
  }

  const data = await response.json();
  const content: string = data.choices[0].message.content;
  const isGlobal = useGlobalContext;

  return Response.json({ content, isGlobal });
}
