# Demo Football AI Analysis App

## 🎥 Demo aplikacji

### Funkcje demonstracyjne:

1. **Wyszukiwanie meczów**
   - Wybór ligi (Premier League, La Liga)
   - Wybór roku i miesiąca
   - Wybór drużyn z dropdown listy
   - Filtrowanie według jednej lub dwóch drużyn

2. **Szczegóły meczu**
   - Statystyki meczu z ikonami
   - Wydarzenia (gole, kartki, zmiany) z kolorami
   - Składy drużyn z pozycjami
   - Statystyki zawodników
   - Predykcje AI z radami

3. **Analiza AI**
   - Rekomendacje zakładów (1/X/2)
   - Poziom pewności (1-10)
   - Uzasadnienie rekomendacji
   - Sugerowane typy zakładów

## 📸 Screenshots

### Główny interfejs
![Main Interface](main-interface.png)

### Wyszukiwanie meczów
![Match Search](match-search.png)

### Szczegóły meczu
![Match Details](match-details.png)

### Analiza AI
![AI Analysis](ai-analysis.png)

## 🎯 Przykłady użycia

### Przykład 1: Manchester United vs Manchester City
- **Liga**: Premier League
- **Data**: Listopad 2023
- **Wynik**: 0-3 dla Manchester City
- **AI Rekomendacja**: Manchester City (pewność: 8/10)

### Przykład 2: Barcelona vs Real Madrid
- **Liga**: La Liga
- **Data**: Grudzień 2023
- **AI Rekomendacja**: Draw (pewność: 6/10)

## 🚀 Live Demo

Aplikacja jest dostępna lokalnie po uruchomieniu:

```bash
# Backend
cd backend && npm start

# Frontend
cd frontend && npm start
```

**URL**: http://localhost:3001

## 📊 Statystyki demo

- **Obsługiwane ligi**: 2 (Premier League, La Liga)
- **Drużyny**: 30+ drużyn
- **Mecze**: Dostępne mecze z 2022-2023
- **Funkcje AI**: Pełna analiza z GPT-4o
- **Szczegóły**: Statystyki, wydarzenia, składy, predykcje

## 🎨 Design

- **Framework**: Material-UI
- **Kolory**: Responsywne z ikonami
- **Layout**: Grid system z kartami
- **Animacje**: Hover effects i transitions
- **Icons**: Emoji i Material Icons

## 🔧 Techniczne szczegóły

- **Frontend**: React 18 + Material-UI
- **Backend**: Node.js + Express.js
- **API**: API-Football, OpenAI GPT-4o
- **Database**: SQLite
- **Styling**: CSS-in-JS z Material-UI 