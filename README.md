# Football AI Analysis App

Aplikacja do analizy meczów piłkarskich z integracją AI dla rekomendacji zakładów.

## Funkcje

- 🔍 **Wyszukiwanie meczów** - według ligi, roku, miesiąca i drużyn
- 📊 **Szczegółowe statystyki** - statystyki meczu, wydarzenia, składy drużyn
- 🤖 **Analiza AI** - rekomendacje zakładów z użyciem GPT-4o
- 📈 **Historia analiz** - zapisywanie i przeglądanie poprzednich analiz
- 🎯 **Wielu lig** - Premier League, La Liga i inne

## Technologie

- **Frontend**: React + Material-UI
- **Backend**: Node.js + Express.js
- **Baza danych**: SQLite
- **AI**: OpenAI GPT-4o
- **API**: API-Football, OddsAPI

## Instalacja

### Wymagania
- Node.js (v16+)
- npm lub yarn

### Konfiguracja

1. **Sklonuj repozytorium**
```bash
git clone <repository-url>
cd football-ai-app
```

2. **Zainstaluj zależności**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. **Skonfiguruj zmienne środowiskowe**
```bash
# W katalogu backend/
cp env.example .env
```

Edytuj plik `.env` i dodaj swoje klucze API:
```env
API_FOOTBALL_KEY=your_api_football_key
ODDS_API_KEY=your_odds_api_key
OPENAI_API_KEY=your_openai_api_key
PORT=3000
NODE_ENV=development
DB_PATH=./football_analysis.db
```

### Uruchomienie

1. **Backend** (port 3000)
```bash
cd backend
npm start
```

2. **Frontend** (port 3001)
```bash
cd frontend
npm start
```

3. **Otwórz przeglądarkę**
```
http://localhost:3001
```

## Użycie

1. **Wybierz ligę** z listy dostępnych lig
2. **Wybierz rok i miesiąc** lub konkretną datę
3. **Wybierz drużyny** z dropdown listy
4. **Zaznacz opcje** analizy (statystyki, wydarzenia, składy)
5. **Kliknij "Wyszukaj mecze"**
6. **Kliknij na mecz** aby zobaczyć szczegóły
7. **Użyj analizy AI** dla rekomendacji zakładów

## API Endpoints

### Backend (port 3000)
- `POST /api/analyze` - Analiza meczu z AI
- `GET /api/matches-by-month` - Wyszukiwanie meczów
- `GET /api/teams` - Lista drużyn z ligi
- `GET /api/leagues` - Lista dostępnych lig
- `GET /api/history` - Historia analiz
- `GET /api/fixtures/*` - Szczegóły meczów
- `GET /api/health` - Status serwera

## Struktura projektu

```
football-ai-app/
├── backend/
│   ├── server.js          # Główny serwer Express
│   ├── package.json       # Zależności backend
│   ├── env.example        # Przykład zmiennych środowiskowych
│   └── .env              # Zmienne środowiskowe (nie w git)
├── frontend/
│   ├── src/
│   │   ├── App.js         # Główny komponent React
│   │   └── App.css        # Style
│   ├── package.json       # Zależności frontend
│   └── public/
├── README.md              # Ten plik
└── .gitignore            # Pliki ignorowane przez Git
```

## Funkcje szczegółowe

### Wyszukiwanie meczów
- Wyszukiwanie według miesiąca (nie konkretnej daty)
- Filtrowanie według jednej lub dwóch drużyn
- Dropdown listy dla lig i drużyn

### Szczegóły meczu
- **Statystyki meczu** - strzały, posiadanie piłki, kartki
- **Wydarzenia** - gole, kartki, zmiany z ikonami
- **Składy drużyn** - podstawowe składy z pozycjami
- **Statystyki zawodników** - gole, asysty, kartki
- **Predykcje** - rekomendacje AI z radami

### Analiza AI
- Analiza formy drużyn
- Statystyki head-to-head
- Kontuzje i absencje
- Rekomendacje zakładów (1/X/2)
- Poziom pewności (1-10)
- Sugerowane typy zakładów

## Ograniczenia API

- **API-Football**: Darmowy plan - 100 zapytań/dzień
- **Sezony**: Dostępne tylko 2021-2023 w darmowym planie
- **Dane**: Niektóre szczegółowe dane mogą być niedostępne

## Rozwój

### Dodanie nowej ligi
1. Dodaj ligę do `getLeagueId()` w `backend/server.js`
2. Dodaj statyczne dane drużyn (jeśli potrzebne)
3. Zaktualizuj frontend

### Dodanie nowych funkcji
1. Dodaj endpoint w `backend/server.js`
2. Dodaj komponent w `frontend/src/App.js`
3. Zaktualizuj dokumentację

## Licencja

MIT License

## Autor

Football AI Analysis App - Aplikacja do analizy meczów piłkarskich z AI 