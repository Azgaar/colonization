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
| `card.ogg` | An agent is played; a card is drawn or taken | Casino Audio (card) |
| `dice.ogg` | Dice are rolled: combat, gifts, ruins, the war | Casino Audio (dice) |
| `coins.ogg` | Gold earned or paid: trade, tax, hire | Casino Audio (chips) |
| `sail.ogg` | The ship moves (once per move) | water splash; Impact or RPG |
| `march.ogg` | The pawn moves (once per move) | RPG Audio (footsteps) |
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
| `turn`, `reveal` | Interface Sounds: confirmation_002, maximize_001 |
| `card`, `event`, `dice` | Casino Audio: card-place-1, card-slide-1, dice-throw-1 |
| `coins`, `sail` | RPG Audio: handleCoins, creak1 (a ship's creak; the packs have no water) |
| `build`, `bell` | Impact Sounds: impactPlank_medium_000, impactBell_heavy_000 |
| `march` | three grass footsteps, 0.28 s apart |
| `found` | two heavy wood blows (a hammer) |
| `battle` | three metal impacts (a clash) |
| `war` | three heavy soft impacts, 0.42 s apart (a drum) |

## Music

Source chosen by the designer (2026-11-26): real recordings of baroque music under free licences, not generated music. Widened the same day to other music of the period, so the baroque does not tire: a Haydn quartet, and fifes and drums for the war; the best-known pieces (Vivaldi's Four Seasons) left out. The recordings come from Wikimedia Commons; each licence was checked on its file page. The originals are kept in one folder, `assets/Sound/music/`, with the credits and each piece's mood in `packages/web/sound/music.json`, which the About page shows. `packages/web/tools/music.sh` (needs ffmpeg) prepares them for the game:
- it trims the silence before and after each piece;
- it levels each piece to about −20 LUFS in two passes, so the dynamics stay as played; a piece whose loudness range is over 11 LU (a singer's soft passages, a funeral march) is first brought nearer, so its quiet parts are not lost under the game. Every piece then measures −20 ± 0.6 LUFS;
- it drops the files' tags and cover art;
- it encodes them as Opus at 64 kb/s into `sound/music/` (only pieces not encoded yet; `ALL=1` encodes all again), 36 MB in all.

Five moods, set in `music.json`. The main menu always plays one signature piece, Albinoni's Adagio. The game plays one rotation through every round. The War of Independence plays marches. The end plays one piece: Garryowen when the player has won, Purcell's funeral march when they have lost; the short `win` and `lose` endings are then heard only when the music is turned off or paused. Each mood plays its pieces in an order shuffled once when the page opens, round and round, and goes on from where it was when the game comes back to it; a piece crossfades into the next as it ends, and into the new mood's when the mood changes. The player in Options names the piece playing ("Surname: Title"); that name is also the list of every piece, in alphabetical order, so any piece can be played, whatever the mood; Next goes on through all of them in the shuffled order. When a piece chosen by hand ends, the mood's playlist goes on. One movement of each work is kept, so no tune comes back as another part of itself.

| Mood | File | Piece | Performers | Licence |
|---|---|---|---|---|
| Main menu (the signature piece) | `albinoni-op9-2-adagio.ogg` | [Tomaso Albinoni: Oboe Concerto in D minor, Adagio](https://commons.wikimedia.org/wiki/File:Albinoni,_Concerto_for_Oboe_and_Strings_No._2_in_D_minor,_Op._9,_II._Adagio.ogg) | Paul Arden-Taylor, oboe | CC0 |
| The game | `ombra-mai-fu.ogg` | [George Frideric Handel: Ombra mai fù, from the opera Serse](https://commons.wikimedia.org/wiki/File:Les_Arts_Florissants_-_Handel%27s_Serse,_HWV_40_-_Ombra_mai_fu.ogg) | Lea Desandre and Les Arts Florissants | CC BY 3.0 |
|  | `brandenburg-3-allegro.ogg` | [Johann Sebastian Bach: Brandenburg Concerto No. 3, Allegro](https://commons.wikimedia.org/wiki/File:Bach_-_Brandenburg_Concerto_No._3_-_1._Allegro.ogg) | Advent Chamber Orchestra | CC BY-SA 2.0 |
|  | `telemann-viola-allegro.ogg` | [Georg Philipp Telemann: Viola Concerto in G, Allegro](https://commons.wikimedia.org/wiki/File:Telemann_-_Viola_Concerto_Gmaj_-_2._Allegro.ogg) | Elias Goldstein, viola, with the Advent Chamber Orchestra | CC BY-SA 2.0 |
|  | `albinoni-op9-3-1-allegro.ogg` | [Tomaso Albinoni: Concerto for Two Oboes in F, Allegro](https://commons.wikimedia.org/wiki/File:Albinoni_-_Concerto_for_2_Oboes_in_F_Major,_op._9_No._3_-_1._Allegro.ogg) | Humbert Lucarelli and Edino Biaggi, oboes, with the Advent Chamber Orchestra | CC BY-SA 2.0 |
|  | `lully-chaconne-scaramouches.ogg` | [Jean-Baptiste Lully: The Bourgeois Gentleman, Chaconne of the Scaramouches](https://commons.wikimedia.org/wiki/File:Lully_Le_Bourgeois_Gentilhomme_-_10._Chaconne_des_Scaramouche,_Trivelins.ogg) | Advent Chamber Orchestra | CC BY-SA 2.0 |
|  | `handel-op6-9-larghetto.ogg` | [George Frideric Handel: Concerto Grosso in F, Larghetto](https://commons.wikimedia.org/wiki/File:L%27Arco_Magico_Chamber_Orchestra_-_Handel%27s_Concerto_Grosso_in_F_major,_Op._6_No._9,_HWV_327_-_III._Larghetto.ogg) | L'Arco Magico Chamber Orchestra | CC BY 3.0 |
|  | `handel-op6-7-andante.ogg` | [George Frideric Handel: Concerto Grosso in B-flat, Andante](https://commons.wikimedia.org/wiki/File:L%27Arco_Magico_Chamber_Orchestra_-_Handel%27s_Concerto_Grosso_in_B-flat_major,_Op._6_No._7,_HWV_325_-_IV._Andante.ogg) | L'Arco Magico Chamber Orchestra | CC BY 3.0 |
|  | `handel-op6-2-andante-larghetto.ogg` | [George Frideric Handel: Concerto Grosso in F, Andante Larghetto](https://commons.wikimedia.org/wiki/File:L%27Arco_Magico_Chamber_Orchestra_-_Handel%27s_Concerto_Grosso_in_F_major,_Op._6_No._2,_HWV_320_-_I._Andante_larghetto.ogg) | L'Arco Magico Chamber Orchestra | CC BY 3.0 |
|  | `corelli-op6-4-adagio-allegro.ogg` | [Arcangelo Corelli: Concerto Grosso in D, Adagio and Allegro](https://commons.wikimedia.org/wiki/File:Corelli_-_Concerto_Grosso_Op._6_No._4_-_1._Adagio_-_Allegro.ogg) | Advent Chamber Orchestra | CC BY-SA 2.0 |
|  | `haydn-lark-menuetto.ogg` | [Joseph Haydn: The Lark String Quartet, Minuet](https://commons.wikimedia.org/wiki/File:Haydn_StringQuartetInDMajorOp.64_JosephHaydn-StringQuartetInDOp.645H363Lark-03-MenuettoAllegretto.ogg) | Musopen String Quartet | Public domain |
|  | `vivaldi-two-violins-a-minor.ogg` | [Antonio Vivaldi: Concerto for Two Violins in A minor, Allegro](https://commons.wikimedia.org/wiki/File:Vivaldi_-_Concerto_for_Two_Violins_in_A_minor,_Op._3,_No._8_-_1._Allegro.ogg) | Jacques Israelievitch and Rebecca Pavel Goldstein, violins, with the Advent Chamber Orchestra | CC BY-SA 2.0 |
|  | `vivaldi-santo-sepolcro.ogg` | [Antonio Vivaldi: Sinfonia for the Holy Sepulchre](https://commons.wikimedia.org/wiki/File:Vivaldi_SinfoniaalSantoSepolcro_RV169_Esmuc.ogg) | Early-music orchestra of ESMUC, conducted by Lluís Vila | CC BY-SA 4.0 |
|  | `brandenburg-6-allegro.ogg` | [Johann Sebastian Bach: Brandenburg Concerto No. 6, Allegro](https://commons.wikimedia.org/wiki/File:Bach_-_Brandenburg_Concerto_6_-_1._Allegro.ogg) | Advent Chamber Orchestra | CC BY-SA 2.0 |
|  | `marais-sonnerie.ogg` | [Marin Marais: The Bells of Sainte-Geneviève](https://commons.wikimedia.org/wiki/File:Marin_Marais_-_Sonnerie_de_Ste-Genevi%C3%A8ve_du_Mont-de-Paris_%28Advent_Chamber_Orchestra%29.ogg) | Stephen Balderston, cello, with the Advent Chamber Orchestra | CC BY-SA 2.0 |
| War of Independence | `presidents-march.ogg` | [Philip Phile: The President’s March](https://commons.wikimedia.org/wiki/File:The_United_States_Army_Old_Guard_Fife_and_Drum_Corps_-_03_-_The_Presidents_March.ogg) | U.S. Army Old Guard Fife and Drum Corps | CC0 |
|  | `brandywine-quickstep.ogg` | [Traditional: Brandywine Quickstep](https://commons.wikimedia.org/wiki/File:The_United_States_Army_Old_Guard_Fife_and_Drum_Corps_-_10_-_Brandywine_Quickstep_from_the_Minstrel_Boy_Show.ogg) | U.S. Army Old Guard Fife and Drum Corps | CC0 |
| The end, won | `garryowen.ogg` | [Traditional Irish: Garryowen](https://commons.wikimedia.org/wiki/File:Garryowen_-_U.S._Army_Field_Band.ogg) | U.S. Army Field Band | Public domain |
| The end, lost | `purcell-queen-mary-march.ogg` | [Henry Purcell: March for the Funeral of Queen Mary](https://commons.wikimedia.org/wiki/File:H._Purcell_-_March_from_Music_for_the_funeral_of_Queen_Mary.oga) | Performer unknown | CC BY-SA 3.0 |

`win.ogg` and `lose.ogg` (in `fx/`) are the last 9 seconds of Brandenburg No. 3 and the last 11 seconds of Albinoni's Adagio, cut by the same script.

Licences: CC BY and CC BY-SA require credit, given on the About page and here. Share-alike (CC BY-SA) applies to these audio files and any edited versions of them, not to the game. To add a piece: put it in `assets/Sound/music/`, add its entry to `music.json` with its mood, run `music.sh`, then `pnpm web:build`.
