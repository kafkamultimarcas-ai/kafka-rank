# Gamification Fix Notes

## Problems Found
1. TV showing "Nenhuma competição ativa" - FIXED: Competition 90001 had 0 participants. Added auto-add logic on activation + manually inserted participants.
2. Photo upload - Already works in MinhaArea (sellers can click their avatar)
3. Ranking visibility for sellers - FIXED: Added competition ranking widget to MinhaArea showing position, mini-leaderboard, and link to full race
4. RaceTrack back button - FIXED: Now uses buildTenantPath to go back to minha-area

## Changes Made
- server/routers.ts: Added auto-add participants when competition status changes to "active" (individual type)
- client/src/pages/admin/AdminCompetitions.tsx: Added "Adicionar Todos" button in participants dialog
- client/src/pages/MinhaArea.tsx: Added competitions.list query + ranking widget with position, mini-leaderboard, and "Ver Corrida Completa" button
- client/src/pages/RaceTrack.tsx: Added buildTenantPath import and fixed back button navigation

## DB Fix Applied
- Inserted participants for competition 90001 (Plantao 12 H) - all active sellers with department vendas/pre_vendas

## Still To Do (Phase 5)
- Improve TVMode visual (already looks decent but can be enhanced)
- Improve RaceTrack visual for mobile sellers
- The TVMode already has: podium, race lanes with cars, alerts system, clock, goals sidebar
- The RaceTrack already has: podium, race cars, mata-mata bracket, team view, photo upload
