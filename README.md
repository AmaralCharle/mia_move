# Mia Move - Setup rápido

Este repositório contém o front-end da aplicação Mia Move (Vite + React) e está preparado para usar Firebase (Firestore + Auth anônimo).

Resumo rápido — o que fazer para rodar localmente:

1. Instale dependências

```bash
npm install
```

2. Crie a configuração do Firebase

- No Console Firebase (https://console.firebase.google.com) crie um projeto.
- Habilite Authentication → Sign-in method → **Anonymous**.
- Crie o Firestore (modo `test` para desenvolvimento é mais simples; ajuste regras para produção).
- No Project settings → Your apps, registre um app Web e copie o `firebaseConfig`.

3. Coloque a configuração em `.env.local` (na raiz do projeto)

Crie um arquivo `.env.local` e coloque exatamente (substitua os valores pelo seu JSON):

```text
VITE_FIREBASE_CONFIG='{"apiKey":"<API_KEY>","authDomain":"<PROJECT>.firebaseapp.com","projectId":"<PROJECT>","storageBucket":"<PROJECT>.appspot.com","messagingSenderId":"...","appId":"..."}'
```

Observações:
- Use aspas simples ao redor do JSON para evitar problemas de parsing.
- NUNCA comite seus arquivos `.env*` (já estão no `.gitignore`).

4. Rodar o servidor de desenvolvimento

```bash
npm run dev
```

Abra: http://localhost:5173

5. Debug e logs

- Abra DevTools (F12) → Console. O app imprime logs verbosos antes das operações Firestore (`console.debug('Firestore add: ...')`).
- Se uma escrita falhar, haverá `console.error(...)` com a mensagem. Cole aqui o erro e eu ajudo.

6. Problemas comuns

- `ERR_CONNECTION_REFUSED`: provavelmente o dev server não está rodando. Rode `npm run dev` em foreground.
- Se as escritas retornarem `PERMISSION_DENIED`/403, ajuste as regras do Firestore ou habilite Auth anônimo.

7. Testes locais sem Firebase (opcional)

Você pode usar o Firebase Emulator Suite para desenvolvimento local sem tocar um projeto real. Consulte a documentação do Firebase para configurar emuladores.

---

Este README foi criado automaticamente pelo assistente; se quiser, amplio com instruções de deploy (Netlify/Vercel) ou com exemplos de regras do Firestore para produção.

# Mia Move Hub - Project Scaffold

This is a minimal Vite + React scaffold created from the uploaded file `mia.txt` (original file citation: fileciteturn1file0).

What I generated:
- `package.json` (Vite + React + Firebase dependency)
- `index.html`
- `src/main.jsx` (entry)
- `src/App.jsx` (your uploaded code placed here)
- `README.md` (this file)

How to run locally (basic):
1. Install Node.js (v18+ recommended).
2. In project root run: `npm install`
3. Start dev server: `npm run dev`
4. Open the printed URL (usually http://localhost:5173)

Important notes & caveats:
- I placed your uploaded `mia.txt` content into `src/App.jsx` without major refactors. The original file contains several incomplete fragments and a few likely syntax errors (e.g. stray dots like `.{` or `.doc.data()` fragments and some templating placeholders). You may need to fix those to make the app compile.
- The UI uses Tailwind CSS classes in many components. Tailwind is NOT configured here — you can either add Tailwind or keep the classes (they'll be plain HTML classes if Tailwind isn't installed).
- Firebase config is expected to be provided at runtime via environment or embedding `__firebase_config` and `__app_id` as global variables. The app includes runtime guards for missing config.
- I did NOT modify your original code content except to wrap it as `src/App.jsx`. If you'd like, I can attempt to fix syntax issues and split components into files in a follow-up message.
