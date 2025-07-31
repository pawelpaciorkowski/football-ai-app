const express = require('express');
const axios = require('axios');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize SQLite database
const db = new sqlite3.Database(process.env.DB_PATH || './football_analysis.db');

// Create tables if they don't exist
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS analysis_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    league TEXT,
    date TEXT,
    home_team TEXT,
    away_team TEXT,
    analysis TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Helper function to get league ID
const getLeagueId = (leagueName) => {
    // If leagueName is already a number, return it
    if (typeof leagueName === 'number' || !isNaN(leagueName)) {
        return parseInt(leagueName);
    }

    // If it's a string, try to map it to league ID
    const leagues = {
        'premier_league': 39,
        'la_liga': 140,
        'bundesliga': 78,
        'serie_a': 135,
        'ligue_1': 61
    };

    // If it's a string, convert to lowercase before checking
    if (typeof leagueName === 'string') {
        return leagues[leagueName.toLowerCase()] || leagueName;
    }

    return leagueName;
};

// Helper function to get team ID
const getTeamId = async (teamName, leagueId) => {
    try {
        const response = await axios.get('https://v3.football.api-sports.io/teams', {
            headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': process.env.API_FOOTBALL_KEY
            },
            params: { league: leagueId, search: teamName }
        });

        if (response.data.response && response.data.response.length > 0) {
            return response.data.response[0].team.id;
        }
        return null;
    } catch (error) {
        console.error('Error getting team ID:', error);
        return null;
    }
};

// Main analysis endpoint
app.post('/api/analyze', async (req, res) => {
    try {
        const { league, date, homeTeam, awayTeam, options = {} } = req.body;

        if (!league || !date || !homeTeam || !awayTeam) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const leagueId = getLeagueId(league);

        // Get team IDs
        const homeTeamId = await getTeamId(homeTeam, leagueId);
        const awayTeamId = await getTeamId(awayTeam, leagueId);

        if (!homeTeamId || !awayTeamId) {
            return res.status(400).json({ error: 'Could not find team IDs' });
        }

        // Collect data from API-Football
        const data = {};

        // Get recent fixtures for both teams
        try {
            const fixturesResponse = await axios.get('https://v3.football.api-sports.io/fixtures', {
                headers: {
                    'x-rapidapi-host': 'v3.football.api-sports.io',
                    'x-rapidapi-key': process.env.API_FOOTBALL_KEY
                },
                params: {
                    team: homeTeamId,
                    last: 10,
                    season: 2023
                }
            });
            data.homeTeamFixtures = fixturesResponse.data.response;
        } catch (error) {
            console.error('Error fetching home team fixtures:', error);
            data.homeTeamFixtures = [];
        }

        try {
            const awayFixturesResponse = await axios.get('https://v3.football.api-sports.io/fixtures', {
                headers: {
                    'x-rapidapi-host': 'v3.football.api-sports.io',
                    'x-rapidapi-key': process.env.API_FOOTBALL_KEY
                },
                params: {
                    team: awayTeamId,
                    last: 10,
                    season: 2023
                }
            });
            data.awayTeamFixtures = awayFixturesResponse.data.response;
        } catch (error) {
            console.error('Error fetching away team fixtures:', error);
            data.awayTeamFixtures = [];
        }

        // Get team statistics
        try {
            const homeStatsResponse = await axios.get('https://v3.football.api-sports.io/teams/statistics', {
                headers: {
                    'x-rapidapi-host': 'v3.football.api-sports.io',
                    'x-rapidapi-key': process.env.API_FOOTBALL_KEY
                },
                params: {
                    team: homeTeamId,
                    league: leagueId,
                    season: 2023
                }
            });
            data.homeTeamStats = homeStatsResponse.data.response;
        } catch (error) {
            console.error('Error fetching home team stats:', error);
            data.homeTeamStats = null;
        }

        try {
            const awayStatsResponse = await axios.get('https://v3.football.api-sports.io/teams/statistics', {
                headers: {
                    'x-rapidapi-host': 'v3.football.api-sports.io',
                    'x-rapidapi-key': process.env.API_FOOTBALL_KEY
                },
                params: {
                    team: awayTeamId,
                    league: leagueId,
                    season: 2023
                }
            });
            data.awayTeamStats = awayStatsResponse.data.response;
        } catch (error) {
            console.error('Error fetching away team stats:', error);
            data.awayTeamStats = null;
        }

        // Get injuries if requested
        if (options.includeInjuries) {
            try {
                const injuriesResponse = await axios.get('https://v3.football.api-sports.io/injuries', {
                    headers: {
                        'x-rapidapi-host': 'v3.football.api-sports.io',
                        'x-rapidapi-key': process.env.API_FOOTBALL_KEY
                    },
                    params: {
                        league: leagueId,
                        season: 2023
                    }
                });
                data.injuries = injuriesResponse.data.response;
            } catch (error) {
                console.error('Error fetching injuries:', error);
                data.injuries = [];
            }
        }

        // Get odds if API key is available
        if (process.env.ODDS_API_KEY) {
            try {
                const oddsResponse = await axios.get('https://api.the-odds-api.com/v4/sports/soccer_epl/odds', {
                    params: {
                        apiKey: process.env.ODDS_API_KEY,
                        regions: 'eu',
                        markets: 'h2h'
                    }
                });
                data.odds = oddsResponse.data;
            } catch (error) {
                console.error('Error fetching odds:', error);
                data.odds = [];
            }
        }

        // Create AI analysis prompt
        const prompt = `
Analizuj dane meczowe i udziel rekomendacji zakładu:

MECZ: ${homeTeam} vs ${awayTeam}
DATA: ${date}
LIGA: ${league}

DANE:
- Ostatnie mecze ${homeTeam}: ${JSON.stringify(data.homeTeamFixtures.slice(0, 5))}
- Ostatnie mecze ${awayTeam}: ${JSON.stringify(data.awayTeamFixtures.slice(0, 5))}
- Statystyki ${homeTeam}: ${JSON.stringify(data.homeTeamStats)}
- Statystyki ${awayTeam}: ${JSON.stringify(data.awayTeamStats)}
${options.includeInjuries ? `- Kontuzje: ${JSON.stringify(data.injuries)}` : ''}
${data.odds ? `- Kursy: ${JSON.stringify(data.odds)}` : ''}

OPCJE ANALIZY: ${JSON.stringify(options)}

Udziel szczegółowej analizy w języku polskim zawierającej:
1. Analizę formy obu drużyn
2. Statystyki head-to-head
3. Kontuzje i absencje (jeśli dostępne)
4. Rekomendację zakładu (1, X, 2 lub handicap)
5. Uzasadnienie rekomendacji
6. Poziom pewności (1-10)
7. Sugerowany typ zakładu (podstawowy, handicap, over/under)

Odpowiedź powinna być w formacie JSON:
{
  "analiza": "szczegółowa analiza...",
  "rekomendacja": "1/X/2",
  "uzasadnienie": "uzasadnienie...",
  "pewnosc": 7,
  "typ_zakladu": "podstawowy/handicap/over_under",
  "kurs_sugerowany": "minimalny kurs do obstawienia"
}
`;

        // Get AI analysis
        const aiResponse = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 2000
        });

        let analysis;
        try {
            analysis = JSON.parse(aiResponse.choices[0].message.content);
        } catch (error) {
            analysis = {
                analiza: aiResponse.choices[0].message.content,
                rekomendacja: 'Brak danych',
                uzasadnienie: 'Nie udało się przeanalizować danych',
                pewnosc: 5,
                typ_zakladu: 'podstawowy',
                kurs_sugerowany: 'N/A'
            };
        }

        // Save to database
        db.run(
            'INSERT INTO analysis_history (league, date, home_team, away_team, analysis) VALUES (?, ?, ?, ?, ?)',
            [league, date, homeTeam, awayTeam, JSON.stringify(analysis)],
            function (err) {
                if (err) {
                    console.error('Error saving to database:', err);
                }
            }
        );

        res.json({
            success: true,
            analysis,
            rawData: data
        });

    } catch (error) {
        console.error('Error in analysis:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
});

// Get analysis history
app.get('/api/history', (req, res) => {
    db.all('SELECT * FROM analysis_history ORDER BY created_at DESC LIMIT 50', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// Get available leagues
app.get('/api/leagues', (req, res) => {
    const leagues = [
        { id: 39, name: 'Premier League', country: 'England' },
        { id: 140, name: 'La Liga', country: 'Spain' },
        { id: 78, name: 'Bundesliga', country: 'Germany' },
        { id: 135, name: 'Serie A', country: 'Italy' },
        { id: 61, name: 'Ligue 1', country: 'France' }
    ];
    res.json(leagues);
});



// Test API-Football connection - TEMPORARILY COMMENTED OUT
/*
app.get('/api/test-football', async (req, res) => {
    try {
        console.log('Testing API-Football connection...');
        console.log('API Key:', process.env.API_FOOTBALL_KEY ? 'Present' : 'Missing');

        const response = await axios.get('https://v3.football.api-sports.io/leagues', {
            headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': process.env.API_FOOTBALL_KEY
            },
            params: { country: 'England' }
        });

        console.log('API Response status:', response.status);
        console.log('API Response data length:', response.data.response?.length || 0);

        res.json({
            success: true,
            message: 'API-Football connection successful!',
            leaguesFound: response.data.response?.length || 0,
            sampleLeague: response.data.response?.[0] || null
        });
    } catch (error) {
        console.error('API-Football test error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: 'API-Football connection failed',
            details: error.response?.data || error.message
        });
    }
});
*/

// Test team search - TEMPORARILY COMMENTED OUT
/*
app.get('/api/test-teams', async (req, res) => {
    try {
        const { search = 'Manchester City' } = req.query;

        const response = await axios.get('https://v3.football.api-sports.io/teams', {
            headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': process.env.API_FOOTBALL_KEY
            },
            params: { search }
        });

        res.json({
            success: true,
            searchTerm: search,
            teamsFound: response.data.response?.length || 0,
            teams: response.data.response || []
        });
    } catch (error) {
        console.error('Team search error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: 'Team search failed',
            details: error.response?.data || error.message
        });
    }
});
*/

// Get matches by month
app.get('/api/matches-by-month', async (req, res) => {
    try {
        const { league, year, month, team1, team2 } = req.query;

        if (!league || !year || !month) {
            return res.status(400).json({ error: 'Missing required fields: league, year, month' });
        }

        const leagueId = getLeagueId(league);

        // Calculate date range for the month
        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

        console.log(`Searching matches for ${startDate} to ${endDate}`);

        // Get fixtures for the month
        const fixturesResponse = await axios.get('https://v3.football.api-sports.io/fixtures', {
            headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': process.env.API_FOOTBALL_KEY
            },
            params: {
                league: leagueId,
                season: year,
                from: startDate,
                to: endDate
            }
        });

        let matches = fixturesResponse.data.response || [];

        // Filter by teams if provided
        if (team1 || team2) {
            console.log(`Filtering matches with team1: "${team1}", team2: "${team2}"`);
            matches = matches.filter(match => {
                const homeTeam = match.teams.home.name.toLowerCase();
                const awayTeam = match.teams.away.name.toLowerCase();

                // If both teams provided, search for exact match
                if (team1 && team2) {
                    const searchTeam1 = team1.toLowerCase();
                    const searchTeam2 = team2.toLowerCase();
                    const result = (homeTeam.includes(searchTeam1) && awayTeam.includes(searchTeam2)) ||
                        (homeTeam.includes(searchTeam2) && awayTeam.includes(searchTeam1));
                    if (result) console.log(`Found match: ${match.teams.home.name} vs ${match.teams.away.name}`);
                    return result;
                }

                // If only one team provided, search for any match with that team
                if (team1 && !team2) {
                    const searchTeam = team1.toLowerCase();
                    const result = homeTeam.includes(searchTeam) || awayTeam.includes(searchTeam);
                    if (result) console.log(`Found match with ${team1}: ${match.teams.home.name} vs ${match.teams.away.name}`);
                    return result;
                }

                if (team2 && !team1) {
                    const searchTeam = team2.toLowerCase();
                    const result = homeTeam.includes(searchTeam) || awayTeam.includes(searchTeam);
                    if (result) console.log(`Found match with ${team2}: ${match.teams.home.name} vs ${match.teams.away.name}`);
                    return result;
                }

                return false;
            });
            console.log(`After filtering: ${matches.length} matches found`);
        }

        res.json({
            success: true,
            league: leagueId,
            year,
            month,
            dateRange: { startDate, endDate },
            matchesFound: matches.length,
            matches: matches.map(match => ({
                id: match.fixture.id,
                date: match.fixture.date,
                status: match.fixture.status.short,
                homeTeam: match.teams.home.name,
                awayTeam: match.teams.away.name,
                homeScore: match.goals.home,
                awayScore: match.goals.away,
                venue: match.fixture.venue?.name
            }))
        });

    } catch (error) {
        console.error('Matches by month error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch matches',
            details: error.response?.data || error.message
        });
    }
});

// Test endpoint
app.get('/api/test-simple', (req, res) => {
    res.json({ message: 'Test endpoint works!' });
});

// Get teams from specific league
app.get('/api/teams', async (req, res) => {
    try {
        const { league } = req.query;
        console.log('Teams endpoint called with league:', league);

        if (!league) {
            return res.status(400).json({ error: 'League parameter is required' });
        }

        const leagueId = getLeagueId(league);
        console.log('League ID:', leagueId);

        // Static teams data for Premier League (39) when API limit is reached
        const premierLeagueTeams = [
            { team: { id: 33, name: "Manchester United", code: "MUN", country: "England", founded: 1878, national: false, logo: "https://media.api-sports.io/football/teams/33.png" } },
            { team: { id: 34, name: "Newcastle", code: "NEW", country: "England", founded: 1892, national: false, logo: "https://media.api-sports.io/football/teams/34.png" } },
            { team: { id: 35, name: "Bournemouth", code: "BOU", country: "England", founded: 1899, national: false, logo: "https://media.api-sports.io/football/teams/35.png" } },
            { team: { id: 36, name: "Fulham", code: "FUL", country: "England", founded: 1879, national: false, logo: "https://media.api-sports.io/football/teams/36.png" } },
            { team: { id: 39, name: "Wolves", code: "WOL", country: "England", founded: 1877, national: false, logo: "https://media.api-sports.io/football/teams/39.png" } },
            { team: { id: 40, name: "Liverpool", code: "LIV", country: "England", founded: 1892, national: false, logo: "https://media.api-sports.io/football/teams/40.png" } },
            { team: { id: 41, name: "Southampton", code: "SOU", country: "England", founded: 1885, national: false, logo: "https://media.api-sports.io/football/teams/41.png" } },
            { team: { id: 42, name: "Arsenal", code: "ARS", country: "England", founded: 1886, national: false, logo: "https://media.api-sports.io/football/teams/42.png" } },
            { team: { id: 45, name: "Everton", code: "EVE", country: "England", founded: 1878, national: false, logo: "https://media.api-sports.io/football/teams/45.png" } },
            { team: { id: 46, name: "Leicester", code: "LEI", country: "England", founded: 1884, national: false, logo: "https://media.api-sports.io/football/teams/46.png" } },
            { team: { id: 47, name: "Tottenham", code: "TOT", country: "England", founded: 1882, national: false, logo: "https://media.api-sports.io/football/teams/47.png" } },
            { team: { id: 48, name: "West Ham", code: "WES", country: "England", founded: 1895, national: false, logo: "https://media.api-sports.io/football/teams/48.png" } },
            { team: { id: 49, name: "Chelsea", code: "CHE", country: "England", founded: 1905, national: false, logo: "https://media.api-sports.io/football/teams/49.png" } },
            { team: { id: 50, name: "Manchester City", code: "MAC", country: "England", founded: 1880, national: false, logo: "https://media.api-sports.io/football/teams/50.png" } },
            { team: { id: 51, name: "Brighton", code: "BRI", country: "England", founded: 1901, national: false, logo: "https://media.api-sports.io/football/teams/51.png" } },
            { team: { id: 52, name: "Crystal Palace", code: "CRY", country: "England", founded: 1905, national: false, logo: "https://media.api-sports.io/football/teams/52.png" } },
            { team: { id: 55, name: "Brentford", code: "BRE", country: "England", founded: 1889, national: false, logo: "https://media.api-sports.io/football/teams/55.png" } },
            { team: { id: 63, name: "Leeds", code: "LEE", country: "England", founded: 1919, national: false, logo: "https://media.api-sports.io/football/teams/63.png" } },
            { team: { id: 65, name: "Nottingham Forest", code: "NOT", country: "England", founded: 1865, national: false, logo: "https://media.api-sports.io/football/teams/65.png" } },
            { team: { id: 66, name: "Aston Villa", code: "AST", country: "England", founded: 1874, national: false, logo: "https://media.api-sports.io/football/teams/66.png" } }
        ];

        // Static teams data for La Liga (140)
        const laLigaTeams = [
            { team: { id: 529, name: "Barcelona", code: "BAR", country: "Spain", founded: 1899, national: false, logo: "https://media.api-sports.io/football/teams/529.png" } },
            { team: { id: 530, name: "Atletico Madrid", code: "ATL", country: "Spain", founded: 1903, national: false, logo: "https://media.api-sports.io/football/teams/530.png" } },
            { team: { id: 541, name: "Real Madrid", code: "REA", country: "Spain", founded: 1902, national: false, logo: "https://media.api-sports.io/football/teams/541.png" } },
            { team: { id: 543, name: "Sevilla", code: "SEV", country: "Spain", founded: 1890, national: false, logo: "https://media.api-sports.io/football/teams/543.png" } },
            { team: { id: 548, name: "Real Sociedad", code: "RSO", country: "Spain", founded: 1909, national: false, logo: "https://media.api-sports.io/football/teams/548.png" } },
            { team: { id: 550, name: "Athletic Club", code: "ATH", country: "Spain", founded: 1898, national: false, logo: "https://media.api-sports.io/football/teams/550.png" } },
            { team: { id: 551, name: "Real Betis", code: "BET", country: "Spain", founded: 1907, national: false, logo: "https://media.api-sports.io/football/teams/551.png" } },
            { team: { id: 552, name: "Villarreal", code: "VIL", country: "Spain", founded: 1923, national: false, logo: "https://media.api-sports.io/football/teams/552.png" } },
            { team: { id: 553, name: "Valencia", code: "VAL", country: "Spain", founded: 1919, national: false, logo: "https://media.api-sports.io/football/teams/553.png" } },
            { team: { id: 554, name: "Celta Vigo", code: "CEL", country: "Spain", founded: 1923, national: false, logo: "https://media.api-sports.io/football/teams/554.png" } }
        ];

        // Return static data based on league
        let teams = [];
        console.log('League ID type:', typeof leagueId, 'Value:', leagueId);
        if (leagueId === 39 || leagueId === '39') {
            teams = premierLeagueTeams;
            console.log('Using static Premier League teams data, teams count:', teams.length);
        } else if (leagueId === 140 || leagueId === '140') {
            teams = laLigaTeams;
            console.log('Using static La Liga teams data, teams count:', teams.length);
        } else {
            // Try API call for other leagues
            try {
                console.log('Making API request to fetch teams...');
                const response = await axios.get('https://v3.football.api-sports.io/teams', {
                    headers: {
                        'x-rapidapi-host': 'v3.football.api-sports.io',
                        'x-rapidapi-key': process.env.API_FOOTBALL_KEY
                    },
                    params: { league: leagueId, season: 2022 }
                });

                console.log('API Response status:', response.status);
                teams = response.data.response || [];
            } catch (error) {
                console.error('Error fetching teams from API:', error.response?.data || error.message);
                teams = [];
            }
        }

        res.json({
            success: true,
            teams: teams
        });
    } catch (error) {
        console.error('Error in teams endpoint:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to fetch teams',
            details: error.response?.data || error.message
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get fixture statistics
app.get('/api/fixtures/statistics', async (req, res) => {
    try {
        const { fixture, team, type, half } = req.query;

        if (!fixture) {
            return res.status(400).json({ error: 'Fixture parameter is required' });
        }

        const params = { fixture };
        if (team) params.team = team;
        if (type) params.type = type;
        if (half) params.half = half;

        const response = await axios.get('https://v3.football.api-sports.io/fixtures/statistics', {
            headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': process.env.API_FOOTBALL_KEY
            },
            params
        });

        res.json({
            success: true,
            statistics: response.data.response || []
        });
    } catch (error) {
        console.error('Error fetching fixture statistics:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to fetch fixture statistics',
            details: error.response?.data || error.message
        });
    }
});

// Get fixture events
app.get('/api/fixtures/events', async (req, res) => {
    try {
        const { fixture, team, player, type } = req.query;

        if (!fixture) {
            return res.status(400).json({ error: 'Fixture parameter is required' });
        }

        const params = { fixture };
        if (team) params.team = team;
        if (player) params.player = player;
        if (type) params.type = type;

        const response = await axios.get('https://v3.football.api-sports.io/fixtures/events', {
            headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': process.env.API_FOOTBALL_KEY
            },
            params
        });

        res.json({
            success: true,
            events: response.data.response || []
        });
    } catch (error) {
        console.error('Error fetching fixture events:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to fetch fixture events',
            details: error.response?.data || error.message
        });
    }
});

// Get fixture lineups
app.get('/api/fixtures/lineups', async (req, res) => {
    try {
        const { fixture, team, player, type } = req.query;

        if (!fixture) {
            return res.status(400).json({ error: 'Fixture parameter is required' });
        }

        const params = { fixture };
        if (team) params.team = team;
        if (player) params.player = player;
        if (type) params.type = type;

        const response = await axios.get('https://v3.football.api-sports.io/fixtures/lineups', {
            headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': process.env.API_FOOTBALL_KEY
            },
            params
        });

        res.json({
            success: true,
            lineups: response.data.response || []
        });
    } catch (error) {
        console.error('Error fetching fixture lineups:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to fetch fixture lineups',
            details: error.response?.data || error.message
        });
    }
});

// Get fixture players statistics
app.get('/api/fixtures/players', async (req, res) => {
    try {
        const { fixture, team } = req.query;

        if (!fixture) {
            return res.status(400).json({ error: 'Fixture parameter is required' });
        }

        const params = { fixture };
        if (team) params.team = team;

        const response = await axios.get('https://v3.football.api-sports.io/fixtures/players', {
            headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': process.env.API_FOOTBALL_KEY
            },
            params
        });

        res.json({
            success: true,
            players: response.data.response || []
        });
    } catch (error) {
        console.error('Error fetching fixture players:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to fetch fixture players',
            details: error.response?.data || error.message
        });
    }
});

// Get injuries
app.get('/api/injuries', async (req, res) => {
    try {
        const { league, season, fixture, team, player, date, ids, timezone } = req.query;

        // At least one parameter is required
        if (!league && !season && !fixture && !team && !player && !date && !ids) {
            return res.status(400).json({ error: 'At least one parameter is required' });
        }

        const params = {};
        if (league) params.league = league;
        if (season) params.season = season;
        if (fixture) params.fixture = fixture;
        if (team) params.team = team;
        if (player) params.player = player;
        if (date) params.date = date;
        if (ids) params.ids = ids;
        if (timezone) params.timezone = timezone;

        const response = await axios.get('https://v3.football.api-sports.io/injuries', {
            headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': process.env.API_FOOTBALL_KEY
            },
            params
        });

        res.json({
            success: true,
            injuries: response.data.response || []
        });
    } catch (error) {
        console.error('Error fetching injuries:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to fetch injuries',
            details: error.response?.data || error.message
        });
    }
});

// Get predictions
app.get('/api/predictions', async (req, res) => {
    try {
        const { fixture } = req.query;

        if (!fixture) {
            return res.status(400).json({ error: 'Fixture parameter is required' });
        }

        const response = await axios.get('https://v3.football.api-sports.io/predictions', {
            headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': process.env.API_FOOTBALL_KEY
            },
            params: { fixture }
        });

        res.json({
            success: true,
            predictions: response.data.response || []
        });
    } catch (error) {
        console.error('Error fetching predictions:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to fetch predictions',
            details: error.response?.data || error.message
        });
    }
});

// Get coaches
app.get('/api/coaches', async (req, res) => {
    try {
        const { id, team, search } = req.query;

        // At least one parameter is required
        if (!id && !team && !search) {
            return res.status(400).json({ error: 'At least one parameter is required' });
        }

        const params = {};
        if (id) params.id = id;
        if (team) params.team = team;
        if (search) params.search = search;

        const response = await axios.get('https://v3.football.api-sports.io/coachs', {
            headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': process.env.API_FOOTBALL_KEY
            },
            params
        });

        res.json({
            success: true,
            coaches: response.data.response || []
        });
    } catch (error) {
        console.error('Error fetching coaches:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to fetch coaches',
            details: error.response?.data || error.message
        });
    }
});

// Get players seasons
app.get('/api/players/seasons', async (req, res) => {
    try {
        const { player } = req.query;

        const params = {};
        if (player) params.player = player;

        const response = await axios.get('https://v3.football.api-sports.io/players/seasons', {
            headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': process.env.API_FOOTBALL_KEY
            },
            params
        });

        res.json({
            success: true,
            seasons: response.data.response || []
        });
    } catch (error) {
        console.error('Error fetching players seasons:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to fetch players seasons',
            details: error.response?.data || error.message
        });
    }
});

// Get players profiles
app.get('/api/players/profiles', async (req, res) => {
    try {
        const { player, search, page } = req.query;

        const params = {};
        if (player) params.player = player;
        if (search) params.search = search;
        if (page) params.page = page;

        const response = await axios.get('https://v3.football.api-sports.io/players/profiles', {
            headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': process.env.API_FOOTBALL_KEY
            },
            params
        });

        res.json({
            success: true,
            players: response.data.response || [],
            paging: response.data.paging || {}
        });
    } catch (error) {
        console.error('Error fetching players profiles:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to fetch players profiles',
            details: error.response?.data || error.message
        });
    }
});

// Get players statistics
app.get('/api/players', async (req, res) => {
    try {
        const { id, team, league, season, search, page } = req.query;

        const params = {};
        if (id) params.id = id;
        if (team) params.team = team;
        if (league) params.league = league;
        if (season) params.season = season;
        if (search) params.search = search;
        if (page) params.page = page;

        const response = await axios.get('https://v3.football.api-sports.io/players', {
            headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': process.env.API_FOOTBALL_KEY
            },
            params
        });

        res.json({
            success: true,
            players: response.data.response || [],
            paging: response.data.paging || {}
        });
    } catch (error) {
        console.error('Error fetching players:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to fetch players',
            details: error.response?.data || error.message
        });
    }
});

// Get players squads
app.get('/api/players/squads', async (req, res) => {
    try {
        const { team, player } = req.query;

        // At least one parameter is required
        if (!team && !player) {
            return res.status(400).json({ error: 'At least one parameter is required' });
        }

        const params = {};
        if (team) params.team = team;
        if (player) params.player = player;

        const response = await axios.get('https://v3.football.api-sports.io/players/squads', {
            headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': process.env.API_FOOTBALL_KEY
            },
            params
        });

        res.json({
            success: true,
            squads: response.data.response || []
        });
    } catch (error) {
        console.error('Error fetching players squads:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to fetch players squads',
            details: error.response?.data || error.message
        });
    }
});

// Get players teams
app.get('/api/players/teams', async (req, res) => {
    try {
        const { player } = req.query;

        if (!player) {
            return res.status(400).json({ error: 'Player parameter is required' });
        }

        const response = await axios.get('https://v3.football.api-sports.io/players/teams', {
            headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': process.env.API_FOOTBALL_KEY
            },
            params: { player }
        });

        res.json({
            success: true,
            teams: response.data.response || []
        });
    } catch (error) {
        console.error('Error fetching players teams:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to fetch players teams',
            details: error.response?.data || error.message
        });
    }
});

// Get top scorers
app.get('/api/players/topscorers', async (req, res) => {
    try {
        const { league, season } = req.query;

        if (!league || !season) {
            return res.status(400).json({ error: 'League and season parameters are required' });
        }

        const response = await axios.get('https://v3.football.api-sports.io/players/topscorers', {
            headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': process.env.API_FOOTBALL_KEY
            },
            params: { league, season }
        });

        res.json({
            success: true,
            topScorers: response.data.response || []
        });
    } catch (error) {
        console.error('Error fetching top scorers:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to fetch top scorers',
            details: error.response?.data || error.message
        });
    }
});

// Get top assists
app.get('/api/players/topassists', async (req, res) => {
    try {
        const { league, season } = req.query;

        if (!league || !season) {
            return res.status(400).json({ error: 'League and season parameters are required' });
        }

        const response = await axios.get('https://v3.football.api-sports.io/players/topassists', {
            headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': process.env.API_FOOTBALL_KEY
            },
            params: { league, season }
        });

        res.json({
            success: true,
            topAssists: response.data.response || []
        });
    } catch (error) {
        console.error('Error fetching top assists:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to fetch top assists',
            details: error.response?.data || error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Football AI Analysis Server running on port ${PORT}`);
    console.log(`📊 API endpoints:`);
    console.log(`   POST /api/analyze - Analyze match`);
    console.log(`   GET  /api/history - Get analysis history`);
    console.log(`   GET  /api/leagues - Get available leagues`);
    console.log(`   GET  /api/teams - Get teams from league`);
    console.log(`   GET  /api/matches-by-month - Get matches by month`);
    console.log(`   GET  /api/fixtures/statistics - Get fixture statistics`);
    console.log(`   GET  /api/fixtures/events - Get fixture events`);
    console.log(`   GET  /api/fixtures/lineups - Get fixture lineups`);
    console.log(`   GET  /api/fixtures/players - Get fixture players`);
    console.log(`   GET  /api/injuries - Get injuries`);
    console.log(`   GET  /api/predictions - Get predictions`);
    console.log(`   GET  /api/coaches - Get coaches`);
    console.log(`   GET  /api/players/* - Player endpoints`);
    console.log(`   GET  /api/health - Health check`);
}); 