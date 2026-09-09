// 讲义翻译数据。中文讲义被自动导入；英文/德文翻译存在这里。
// 格式: Day 编号 → HTML 正文(用来替换原有的中文 body)

export type TranslationData = Record<number, Record<'en' | 'de', string>>;

export const dayTranslations: TranslationData = {
  1: {
    en: `<div class="wrap">
      <header class="hero">
        <div class="kicker">365 Days to Full-Stack · PHASE 1 · WEEK 1</div>
        <h1>Day 1 - How Does a Backend Server Handle Many People at Once?</h1>
        <div class="meta">
          Time: <b>3 hours</b> (learn 50 min + hands-on 100 min + notes 30 min) ·
          Topic: <b>Concurrency Models</b> — the first pillar of the backend world ·
          Language: Node.js (just a tool; concepts are what matter)
        </div>
      </header>
      <h2>🍜 The Noodle Shop Analogy: Why Backend Cares About Concurrency</h2>
      <p>You open a noodle shop. Rush hour hits and 100 people pour in at once. You have one stove. What do you do?</p>
      <p>This is the core problem of backend concurrency: <b>how to serve many requests with limited resources</b>.</p>
      
      <h2>📇 Concept Card: Concurrency ≠ Parallelism</h2>
      <ul>
        <li><b>Concurrency:</b> One person (server) juggling many tasks by switching between them. Looks like multitasking.</li>
        <li><b>Parallelism:</b> Many people working at the exact same time. Needs multiple cores.</li>
      </ul>
      <p>Node.js uses concurrency (one person, many tasks). Java/C# use parallelism (many threads). Go uses lightweight concurrency (goroutines).</p>
      
      <h2>👥 Three Staffing Plans = Three Concurrency Models</h2>
      <h3>Plan A: Hire Many Staff (Multithreading)</h3>
      <p>One server per request. Java/C# tradition. Problem: expensive, doesn't scale past a few thousand requests.</p>
      
      <h3>Plan B: One Smart Waiter (Event Loop)</h3>
      <p>One person. Never idle. Takes orders, gives them to the kitchen (callbacks), comes back when ready. Node.js way. Scales to millions.</p>
      
      <h3>Plan C: Lightweight Coroutines</h3>
      <p>Thousands of cheap "fibers". Go's goroutines. Switch context super fast.</p>
      
      <p><b>Bottom line:</b> Concurrency is a runtime strategy, not a language choice. You can do it any way in any language. Node.js picks event loop because it's the cheapest for I/O-heavy work.</p>
    </div>`,
    de: `<div class="wrap">
      <header class="hero">
        <div class="kicker">365 Tage zum Full-Stack · PHASE 1 · WEEK 1</div>
        <h1>Tag 1 - Wie bedient ein Backend-Server viele Personen gleichzeitig?</h1>
        <div class="meta">
          Zeit: <b>3 Stunden</b> (Lernen 50 min + Praktisch 100 min + Notizen 30 min) ·
          Thema: <b>Concurrency-Modelle</b> — das erste Fundament der Backend-Welt ·
          Sprache: Node.js (nur ein Werkzeug; Konzepte sind das Wichtige)
        </div>
      </header>
      <h2>🍜 Die Nudelsuppen-Analogie: Warum Backend Concurrency braucht</h2>
      <p>Du eröffnest eine Nudelsuppen-Bar. Stoßzeit: 100 Kunden strömen gleichzeitig herein. Du hast einen Herd. Was machst du?</p>
      <p>Das ist das Kernproblem der Backend-Concurrency: <b>Wie viele Anfragen mit begrenzten Ressourcen bedienen?</b></p>
      
      <h2>📇 Konzeptkarte: Concurrency ≠ Parallelismus</h2>
      <ul>
        <li><b>Concurrency:</b> Eine Person (Server) jongliert viele Aufgaben, indem sie zwischen ihnen wechselt. Sieht aus wie Multitasking.</li>
        <li><b>Parallelismus:</b> Viele Menschen arbeiten exakt gleichzeitig. Braucht mehrere Kerne.</li>
      </ul>
      <p>Node.js nutzt Concurrency (eine Person, viele Aufgaben). Java/C# nutzen Parallelismus (viele Threads). Go nutzt leichte Concurrency (Goroutines).</p>
      
      <h2>👥 Drei Personalpläne = Drei Concurrency-Modelle</h2>
      <h3>Plan A: Viele Mitarbeiter einstellen (Multithreading)</h3>
      <p>Ein Thread pro Anfrage. Java/C#-Tradition. Problem: teuer, skaliert nicht über tausend Anfragen hinaus.</p>
      
      <h3>Plan B: Ein intelligenter Kellner (Event Loop)</h3>
      <p>Eine Person. Nie untätig. Nimmt Bestellungen auf, gibt sie an die Küche (Callbacks), kommt zurück wenn fertig. Node.js-Art. Skaliert zu Millionen.</p>
      
      <h3>Plan C: Leichte Coroutines</h3>
      <p>Tausende billige "Fibers". Goroutines von Go. Wechseln Kontext blitzschnell.</p>
      
      <p><b>Fazit:</b> Concurrency ist eine Runtime-Strategie, keine Sprachwahl. Du kannst es in jeder Sprache so machen. Node.js wählt Event Loop, weil es das Billigste für I/O-lastige Arbeit ist.</p>
    </div>`,
  },
};

export function getContentInLocale(day: number, locale: string, originalZh: string): string {
  if (locale === 'zh') return originalZh;
  const trans = dayTranslations[day];
  if (!trans) return originalZh; // Fallback wenn keine Übersetzung
  return trans[locale as 'en' | 'de'] || originalZh;
}

export const dayTranslations_234 = {
  2: {
    en: `<div class="wrap"><header class="hero"><h1>Day 2 - The Event Loop's Route: Six Phases and Cleanup Order</h1></header>
    <h2>📇 Concept Card: Six Phases of the Event Loop</h2>
    <p>Node.js event loop visits 6 stations in this order: timers → pending → idle/prepare → poll → check → close. Most action happens at poll (waiting for I/O). nextTick and microtask are side windows that clear between phases.</p>
    <h2>poll Station: The Heart of the Loop</h2>
    <p>This is where the waiter (event loop) waits for network/file I/O callbacks. If nothing is waiting, it spins here. Everything backs up if poll gets blocked.</p>
    <h2>✂️ Two Side Windows: nextTick and Microtask</h2>
    <p>After each phase (except poll), Node clears the microtask queue (Promise.then, async/await). Then nextTick. They are NOT part of the loop phases; they clear between.</p>
    <p>If you recursively call process.nextTick, you can starve the loop. Use setImmediate to yield.</p></div>`,
    de: `<div class="wrap"><header class="hero"><h1>Tag 2 - Die Event-Loop-Route: Sechs Phasen und Aufräumreihenfolge</h1></header>
    <h2>📇 Konzeptkarte: Sechs Phasen der Event Loop</h2>
    <p>Node.js Event Loop besucht 6 Stationen in dieser Reihenfolge: timers → pending → idle/prepare → poll → check → close. Die meiste Aktion passiert bei poll (I/O-Warten). nextTick und microtask sind Nebenfenster, die zwischen Phasen geleert werden.</p>
    <h2>poll Station: Das Herz der Schleife</h2>
    <p>Hier wartet der Kellner (Event Loop) auf Netzwerk-/Datei-I/O-Rückrufe. Wenn nichts wartet, dreht er sich hier. Alles staut sich auf, wenn poll blockiert wird.</p>
    <h2>✂️ Zwei Nebenfenster: nextTick und Microtask</h2>
    <p>Nach jeder Phase (außer poll) löscht Node die Microtask-Warteschlange (Promise.then, async/await). Dann nextTick. Sie sind NICHT Teil der Loop-Phasen; sie werden zwischen ihnen geleert.</p></div>`,
  },
  3: {
    en: `<div class="wrap"><header class="hero"><h1>Day 3 - Stream and Buffer: The Pipes and Buckets of Backend</h1></header>
    <h2>📇 Concept Card #1: Buffer — A Standard Transfer Bucket</h2>
    <p>A fixed-size chunk of memory. Can hold bytes, convert between encodings (UTF-8, Base64). Think of a box that fits exactly 16 items, no more, no less.</p>
    <h2>📇 Concept Card #2: Stream — An Assembly Line, Not a Dump Truck</h2>
    <p>Don't load a 2GB file into memory. Stream it: read chunk, process, discard, repeat. Memory stays constant. Readable, Writable, Transform, Duplex.</p>
    <h2>backpressure: When the Pipe Gets Clogged</h2>
    <p>write() returns false = "stop sending, I'm full". Pause the source. Resume when drain event fires. Do this wrong and you crash: 2GB file → memory explosion.</p>
    <h2>pipe() vs pipeline()</h2>
    <p>pipe() is the classic chaining. pipeline() (since Node 10) handles errors better. Use pipeline() in new code.</p></div>`,
    de: `<div class="wrap"><header class="hero"><h1>Tag 3 - Stream und Buffer: Die Rohre und Eimer des Backends</h1></header>
    <h2>📇 Konzeptkarte #1: Buffer — Ein Standard-Übergabeeimer</h2>
    <p>Ein Speicherelement mit fester Größe. Kann Bytes speichern, zwischen Encodierungen konvertieren (UTF-8, Base64). Stellen Sie sich eine Box vor, die genau 16 Gegenstände fasst, nicht mehr, nicht weniger.</p>
    <h2>📇 Konzeptkarte #2: Stream — Ein Fließband, Kein Lastwagen</h2>
    <p>Laden Sie keine 2-GB-Datei in den Speicher. Streamen Sie: Chunk lesen, verarbeiten, verwerfen, wiederholen. Der Speicher bleibt konstant. Readable, Writable, Transform, Duplex.</p>
    <h2>backpressure: Wenn das Rohr verstopft</h2>
    <p>write() gibt false zurück = "Stopp, ich bin voll". Pause der Quelle. Fortsetzen, wenn drain-Event feuert. Falschen gemacht und Sie abstürzen: 2GB-Datei → Speicherexplosion.</p></div>`,
  },
  4: {
    en: `<div class="wrap"><header class="hero"><h1>Day 4 - Process Model and child_process / cluster: Opening Branches When One Waiter Isn't Enough</h1></header>
    <h2>🧱 Three Physical Limits Even a Perfect Waiter Can't Break</h2>
    <p>Single-threaded Node.js hits three ceilings: one CPU core (no math in the main thread), file descriptor limit (OS limit), and event loop throughput (physical speed of the loop).</p>
    <h2>📇 Concept Card #1: Process vs Thread — Branches vs Waiters</h2>
    <p>Process: isolated VM, separate memory (safe but expensive). Thread: shared memory within one process (fast but dangerous).</p>
    <h2>📇 Concept Card #2: child_process Four Brothers</h2>
    <p><b>exec:</b> shell command, good for scripts. <b>execFile:</b> no shell, faster. <b>spawn:</b> stream-based, best for big output. <b>fork:</b> new Node process, IPC channel for messaging.</p>
    <h2>Two Bombs in child_process</h2>
    <p><b>maxBuffer:</b> limits stdout size. Exceed it and boom. <b>Shell injection:</b> if user input goes into exec, game over.</p>
    <h2>cluster: Sharing Ports Across Processes</h2>
    <p>One primary process. Workers bind to the same port. OS-level load balancing automatically. Restart one worker, others keep running.</p></div>`,
    de: `<div class="wrap"><header class="hero"><h1>Tag 4 - Prozessmodell und child_process / cluster: Filialen eröffnen, wenn ein Kellner nicht genug ist</h1></header>
    <h2>🧱 Drei physische Grenzen, die ein perfekter Kellner nicht durchbrechen kann</h2>
    <p>Node.js mit nur einem Thread trifft auf drei Grenzen: ein CPU-Kern (keine Mathematik im Hauptthread), Dateideskriptor-Limit (OS-Limit) und Event-Loop-Durchsatz.</p>
    <h2>📇 Konzeptkarte #1: Prozess vs Thread — Filialen vs Kellner</h2>
    <p>Prozess: isolierte VM, separater Speicher (sicher aber teuer). Thread: gemeinsamer Speicher innerhalb eines Prozesses (schnell aber gefährlich).</p>
    <h2>📇 Konzeptkarte #2: child_process Vier Brüder</h2>
    <p><b>exec:</b> Shell-Befehl, gut für Skripte. <b>execFile:</b> keine Shell, schneller. <b>spawn:</b> Stream-basiert, am besten für große Ausgabe. <b>fork:</b> neuer Node-Prozess, IPC-Kanal zum Messaging.</p>
    <h2>cluster: Ports über Prozesse hinweg teilen</h2>
    <p>Ein primärer Prozess. Worker binden an den gleichen Port. Automatisches OS-Level-Load-Balancing. Starten Sie einen Worker neu, andere laufen weiter.</p></div>`,
  },
};

// 合并所有翻译
Object.assign(dayTranslations, dayTranslations_234);
