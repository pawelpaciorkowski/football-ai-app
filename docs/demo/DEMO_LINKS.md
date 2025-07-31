# Demo Links - Football AI Analysis App

## 🔗 Linki do demo

### Live Demo
- **URL**: http://localhost:3001 (po uruchomieniu lokalnie)
- **Backend API**: http://localhost:3000/api

### GitHub Repository
- **Repo**: https://github.com/pawelpaciorkowski/football-ai-app
- **README**: https://github.com/pawelpaciorkowski/football-ai-app#readme

## 📸 Screenshots (do dodania)

### Główne ekrany
- `main-interface.png` - Główny interfejs aplikacji
- `match-search.png` - Wyszukiwanie meczów
- `match-details.png` - Szczegóły meczu
- `ai-analysis.png` - Analiza AI

### Funkcje szczegółowe
- `statistics-view.png` - Widok statystyk
- `events-view.png` - Widok wydarzeń
- `lineups-view.png` - Widok składów
- `predictions-view.png` - Widok predykcji

## 🎥 Video Demo (opcjonalnie)

### Screen Recording
- **Format**: MP4 lub GIF
- **Długość**: 2-3 minuty
- **Zawartość**: 
  1. Wyszukiwanie meczów
  2. Szczegóły meczu
  3. Analiza AI
  4. Responsywność

### Narzędzia do nagrywania
- **Linux**: `ffmpeg`, `kazam`, `simplescreenrecorder`
- **Windows**: OBS Studio, ShareX
- **Mac**: QuickTime Player, ScreenFlow

## 📊 Przykładowe dane demo

### API Endpoints do testowania
```bash
# Lista lig
curl http://localhost:3000/api/leagues

# Drużyny Premier League
curl http://localhost:3000/api/teams?league=39

# Mecze z listopada 2023
curl "http://localhost:3000/api/matches-by-month?league=39&year=2023&month=11&team1=Manchester%20United"

# Szczegóły meczu
curl "http://localhost:3000/api/fixtures/statistics?fixture=1234567"
```

### Przykładowe zapytania
```json
{
  "league": "Premier League",
  "date": "2023-11-05",
  "homeTeam": "Manchester United",
  "awayTeam": "Manchester City",
  "options": {
    "includeInjuries": true,
    "includeOdds": true,
    "includeStats": true
  }
}
```

## 🎯 Kluczowe funkcje do pokazania

### 1. Wyszukiwanie meczów
- Dropdown listy lig i drużyn
- Filtrowanie według miesiąca
- Wyniki z podstawowymi informacjami

### 2. Szczegóły meczu
- Statystyki z czytelnym formatowaniem
- Wydarzenia z ikonami i kolorami
- Składy z pozycjami zawodników
- Predykcje z radami AI

### 3. Analiza AI
- Rekomendacje 1/X/2
- Poziom pewności
- Uzasadnienie analizy
- Typy zakładów

### 4. Responsywność
- Różne rozmiary ekranu
- Mobile-friendly design
- Szybkie ładowanie

## 📝 Notatki do prezentacji

### Wprowadzenie (30 sekund)
- "Aplikacja do analizy meczów piłkarskich z AI"
- "Pomoc w podejmowaniu decyzji zakładowych"
- "Integracja z API-Football i OpenAI"

### Demo funkcji (5-7 minut)
1. **Wyszukiwanie** (1-2 min)
2. **Szczegóły meczu** (2-3 min)
3. **Analiza AI** (2 min)

### Podsumowanie (30 sekund)
- "Nowoczesny stack technologiczny"
- "Real-time dane z API"
- "Inteligentne rekomendacje AI"

## 🔧 Techniczne szczegóły demo

### Wymagania systemowe
- Node.js 16+
- npm lub yarn
- Przeglądarka internetowa
- Połączenie internetowe

### Konfiguracja
- Klucze API w pliku .env
- Backend na porcie 3000
- Frontend na porcie 3001

### Backup plan
- Screenshots aplikacji
- Przykładowe dane JSON
- Dokumentacja techniczna 