# Sound and music (FR-U-21)

The game plays sound from `packages/web/sound/`: effects in `sound/fx/`, music in `sound/music/`. Any file that is missing is simply silent, so sound can arrive piece by piece. Volumes for music and effects, and mute, are in Options.

`pnpm web:build` lists the files found in `dist/sounds.json`; rebuild after adding sounds. Sound starts with the first click or key press (browsers allow none before it).

Formats: `.ogg`: Vorbis for the effects, Opus for the music and the win and lose endings.

## Effects

Source agreed with the designer: CC0 packs found online. Proposed: the [Kenney](https://kenney.nl/support) audio packs, all public domain (CC0), attribution not required.

| Pack | Files | Use |
|---|---|---|
| [Interface Sounds](https://kenney.nl/assets/interface-sounds) | 100 | clicks and buttons |
| [Casino Audio](https://kenney.nl/assets/casino-audio) | 50 | cards, dice, chips (coins) |
| [RPG Audio](https://kenney.nl/assets/rpg-audio) | 50 | footsteps, weapons, foley |
| [Impact Sounds](https://kenney.nl/assets/impact-sounds) | 130 | wood, metal and heavy impacts (building, cannon) |

What the game plays, and the file it looks for in `sound/fx/`:

| File | When | From |
|---|---|---|
| `click.ogg` | Any button | Interface Sounds |
| `card.ogg` | An agent is played; a card is drawn or taken | Casino Audio (card) |
| `dice.ogg` | Dice are rolled: combat, gifts, ruins, the war | Casino Audio (dice) |
| `coins.ogg` | Gold earned or paid: trade, tax, hire | Casino Audio (chips) |
| `sail.ogg` | The ship moves (once per move) | water splash; Impact or RPG |
| `march.ogg` | Infantry moves (once per move) | RPG Audio (footsteps) |
| `reveal.ogg` | A part of the map is explored | Interface Sounds (soft whoosh) |
| `found.ogg` | A colony is founded | Impact Sounds (wood, hammer) |
| `build.ogg` | A building is built | Impact Sounds (wood) |
| `bell.ogg` | Bells gained | Impact Sounds (heavy bell) |
| `event.ogg` | The round's event | Casino Audio (card flip) or a paper rustle |
| `battle.ogg` | Combat is resolved | RPG Audio (swords) |
| `war.ogg` | The War of Independence begins | Impact Sounds (heavy drum or cannon) |
| `turn.ogg` | It is your decision again | Interface Sounds (soft chime) |
| `win.ogg`, `lose.ogg` | The game ends | the last seconds of two of the pieces (below) |

In place (2026-11-26): all effects but `win` and `lose`, built by `packages/web/tools/fx.sh` from the packs kept in `assets/Sound/` (needs ffmpeg): it picks the files below, joins a few into short sequences, and levels them to about −24 dB mean. To swap a sound, change its line in the script, run it, then `pnpm web:build`.

| File | Made from |
|---|---|
| `click`, `turn`, `reveal` | Interface Sounds: click_001, confirmation_002, maximize_001 |
| `card`, `event`, `dice` | Casino Audio: card-place-1, card-slide-1, dice-throw-1 |
| `coins`, `sail` | RPG Audio: handleCoins, creak1 (a ship's creak; the packs have no water) |
| `build`, `bell` | Impact Sounds: impactPlank_medium_000, impactBell_heavy_000 |
| `march` | three grass footsteps, 0.28 s apart |
| `found` | two heavy wood blows (a hammer) |
| `battle` | three metal impacts (a clash) |
| `war` | three heavy soft impacts, 0.42 s apart (a drum) |

## Music

Source chosen by the designer (2026-11-26): real recordings of baroque music under free licences, not generated music. The recordings come from Wikimedia Commons; each licence was checked on its file page. The originals are kept in `assets/Sound/music/<mood>/`, with the credits in `assets/Sound/music.json`, which the About page shows. `packages/web/tools/music.sh` (needs ffmpeg) prepares them for the game:
- it trims the silence before and after each piece;
- it levels each piece to about −20 LUFS in two passes, so the dynamics stay as played;
- it encodes them as Opus at 64 kb/s into `sound/music/<mood>/`, 32 MB in all.

Each mood is a playlist: a piece crossfades into another of the same mood as it ends, and into the new mood's when the game moves on. A mood without pieces borrows a neighbour's.

| Mood | File | Piece | Performers | Licence |
|---|---|---|---|---|
| Title screen | `title/ombra-mai-fu.ogg` | [Handel: Serse, “Ombra mai fù”](https://commons.wikimedia.org/wiki/File:Les_Arts_Florissants_-_Handel%27s_Serse,_HWV_40_-_Ombra_mai_fu.ogg) | Lea Desandre, Les Arts Florissants | CC BY 3.0 |
|  | `title/albinoni-op9-2-adagio.ogg` | [Albinoni: Oboe Concerto in D minor, Op. 9 No. 2, II. Adagio](https://commons.wikimedia.org/wiki/File:Albinoni,_Concerto_for_Oboe_and_Strings_No._2_in_D_minor,_Op._9,_II._Adagio.ogg) | Paul Arden-Taylor (oboe), via Musopen | public domain (CC0) |
| Rounds 1–3: exploring and founding | `explore/vivaldi-spring-allegro.ogg` | [Vivaldi: Spring, RV 269, I. Allegro](https://commons.wikimedia.org/wiki/File:The_Modena_Chamber_Orchestra_-_Vivaldi%27s_Spring,_RV_269_-_I._Allegro.ogg) | The Modena Chamber Orchestra, via Musopen | public domain |
|  | `explore/brandenburg-3-allegro.ogg` | [Bach: Brandenburg Concerto No. 3, BWV 1048, I. Allegro](https://commons.wikimedia.org/wiki/File:Bach_-_Brandenburg_Concerto_No._3_-_1._Allegro.ogg) | Advent Chamber Orchestra | CC BY-SA 2.0 |
|  | `explore/telemann-viola-allegro.ogg` | [Telemann: Viola Concerto in G, TWV 51:G9, II. Allegro](https://commons.wikimedia.org/wiki/File:Telemann_-_Viola_Concerto_Gmaj_-_2._Allegro.ogg) | Advent Chamber Orchestra, Elias Goldstein (viola) | CC BY-SA 2.0 |
|  | `explore/albinoni-op9-3-allegro.ogg` | [Albinoni: Concerto for 2 Oboes in F, Op. 9 No. 3, III. Allegro](https://commons.wikimedia.org/wiki/File:Albinoni_-_Concerto_for_2_Oboes_in_F_Major,_op._9_No._3_-_3._Allegro.ogg) | Advent Chamber Orchestra, Humbert Lucarelli and Edino Biaggi (oboes) | CC BY-SA 2.0 |
| Mid game: building and trading | `colony/telemann-viola-largo.ogg` | [Telemann: Viola Concerto in G, TWV 51:G9, I. Largo](https://commons.wikimedia.org/wiki/File:Telemann_-_Viola_Concerto_Gmaj_-_1._Largo.ogg) | Advent Chamber Orchestra, Elias Goldstein (viola) | CC BY-SA 2.0 |
|  | `colony/telemann-viola-andante.ogg` | [Telemann: Viola Concerto in G, TWV 51:G9, III. Andante](https://commons.wikimedia.org/wiki/File:Telemann_-_Viola_Concerto_Gmaj_-_3._Andante.ogg) | Advent Chamber Orchestra, Elias Goldstein (viola) | CC BY-SA 2.0 |
|  | `colony/bach-bwv1055-allegro.ogg` | [Bach: Harpsichord Concerto in A, BWV 1055, I. Allegro](https://commons.wikimedia.org/wiki/File:Bach_-_Harpsichord_Concerto_BWV_1055_-_1._Allegro.ogg) | Advent Chamber Orchestra, Matthew Ganong (harpsichord) | CC BY-SA 2.0 |
| Round 8 on, or someone at 10 bells | `tension/vivaldi-two-violins-a-minor.ogg` | [Vivaldi: Concerto for Two Violins in A minor, Op. 3 No. 8, I. Allegro](https://commons.wikimedia.org/wiki/File:Vivaldi_-_Concerto_for_Two_Violins_in_A_minor,_Op._3,_No._8_-_1._Allegro.ogg) | Advent Chamber Orchestra, Jacques Israelievitch and Rebecca Pavel Goldstein (violins) | CC BY-SA 2.0 |
|  | `tension/albinoni-op9-2-allegro.ogg` | [Albinoni: Oboe Concerto in D minor, Op. 9 No. 2, I. Allegro](https://commons.wikimedia.org/wiki/File:Albinoni,_Concerto_for_Oboe_and_Strings_No._2_in_D_minor,_Op._9,_I._Allegro_e_con_presto.ogg) | Paul Arden-Taylor (oboe), via Musopen | public domain (CC0) |
|  | `tension/vivaldi-santo-sepolcro.ogg` | [Vivaldi: Sinfonia al Santo Sepolcro, RV 169](https://commons.wikimedia.org/wiki/File:Vivaldi_SinfoniaalSantoSepolcro_RV169_Esmuc.ogg) | ESMUC early-music orchestra, Lluís Vila | CC BY-SA 4.0 |
| The War of Independence | `war/vivaldi-summer-presto.ogg` | [Vivaldi: Summer, RV 315, III. Presto](https://commons.wikimedia.org/wiki/File:The_Modena_Chamber_Orchestra_-_Vivaldi%27s_Summer,_RV_315_-_III._Presto.ogg) | The Modena Chamber Orchestra, via Musopen | public domain |
|  | `war/brandenburg-6-allegro.ogg` | [Bach: Brandenburg Concerto No. 6, BWV 1051, I. Allegro](https://commons.wikimedia.org/wiki/File:Bach_-_Brandenburg_Concerto_6_-_1._Allegro.ogg) | Advent Chamber Orchestra | CC BY-SA 2.0 |
|  | `war/telemann-viola-presto.ogg` | [Telemann: Viola Concerto in G, TWV 51:G9, IV. Presto](https://commons.wikimedia.org/wiki/File:Telemann_-_Viola_Concerto_Gmaj_-_4._Presto.ogg) | Advent Chamber Orchestra, Elias Goldstein (viola) | CC BY-SA 2.0 |

`win.ogg` and `lose.ogg` (in `fx/`) are the last 9 seconds of Brandenburg No. 3 and the last 11 seconds of Albinoni's Adagio, cut by the same script.

Licences: CC BY and CC BY-SA require credit, given on the About page and here. Share-alike (CC BY-SA) applies to these audio files and any edited versions of them, not to the game. To add a piece: put it in `assets/Sound/music/<mood>/`, add its entry to `music.json`, run `music.sh`, then `pnpm web:build`.
