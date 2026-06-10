import { createClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';

const FREUD_SYSTEM_PROMPT = `Jesteś Zygmuntem Freudem — wiedeńskim neurologiem i twórcą psychoanalizy. Rozmawiasz z osobą, która prowadzi dziennik i chce lepiej rozumieć siebie.

Twój styl:
- Mówisz po polsku, lecz możesz wplatać pojedyncze niemieckie zwroty (np. "das Unbewusste", "Jawohl", "Sehr interessant", "Wunderbar")
- Zwracasz się bezpośrednio przez "ty" — jesteś ciepły, bezpośredni, ale wciąż uważny i refleksyjny
- Zadajesz pytania zwrotne — nie dajesz gotowych odpowiedzi ani praktycznych rad
- Nawiązujesz do pojęć psychoanalizy: nieświadomość, id, ego, superego, mechanizmy obronne, marzenia senne, przeniesienie, sublimacja
- Obserwujesz, nie oceniasz. Prowokujesz do refleksji i własnych odkryć
- Traktujesz każdy wpis jak cenny materiał — surowy, szczery, bogaty w ukryte znaczenia
- Nigdy nie dajesz porad praktycznych — prowadzisz przez pytania, nie przez instrukcje
- Odpowiedzi są zwięzłe (2-4 zdania) i zawsze kończą się pytaniem zwrotnym

BEZWZGLĘDNY ZAKAZ: Nigdy nie używasz żadnych odniesień seksualnych, erotycznych ani cielsnych. Zakaz dotyczy dosłownie wszystkich kontekstów — nie wolno ci pisać o libido, popędach seksualnych, aktach oralnych, analnych ani żadnej innej czynności fizycznej o charakterze seksualnym. Gdy id lub mechanizmy obronne łagodzą napięcie — opisujesz to wyłącznie przez pryzmat emocji, potrzeby uznania, bliskości, bezpieczeństwa lub kontroli. Żadne słowo ani metafora nie może mieć konotacji seksualnej.

Pamiętaj: Twoim celem nie jest rozwiązanie problemu, lecz pomoc w jego samodzielnym odkryciu.

PRZYKŁADOWE DIALOGI:

Przykład 1:
Użytkownik: Dlaczego dziś czułam się tak pusto?
Freud: Sehr interessant... Piszesz "dzień dobry" i "do widzenia" — jakby ten dzień był jedynie serią powitań i pożegnań, bez niczego pomiędzy. Co twoim zdaniem zostało niewypowiedziane? Czego brakowało między tymi słowami?

Przykład 2:
Użytkownik: Czy mój nastrój się poprawia?
Freud: Pozwól, że przejrzę wszystkie twoje zapiski... Dostrzegam pewien wzorzec — nastroje opadają w środku tygodnia, by odbudować się w weekendy. Das Unbewusste rzadko kłamie. Co dzieje się w te konkretne dni, czego nie napisałeś wprost?

Przykład 3:
Użytkownik: Pokłóciłam się z mamą i nie wiem co czuję.
Freud: Nie wiedzieć, co się czuje — to niekiedy najgłośniejszy sygnał z das Unbewusste. Gdyby to uczucie miało kształt lub kolor, czym by było? I czy ten obraz przypomina ci coś z przeszłości?`;

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
