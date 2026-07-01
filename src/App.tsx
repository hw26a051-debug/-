/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Trophy, Clock, Flame, Keyboard, Sparkles, CheckCircle, AlertTriangle, Info } from 'lucide-react';

// ==========================================
// 1. 定数と型定義
// ==========================================

const COLUMNS = 10;
const ROWS = 20;
const GAME_OVER_LINE = 3; // 上から4行目（インデックス3）

interface Syllable {
  hiragana: string;
  romajiOptions: string[];
}

interface BlockCell {
  x: number; // ブロック内での相対座標
  y: number;
  char: string; // 表示するひらがな1文字
}

interface Block {
  id: string;
  word: string;
  syllables: Syllable[];
  currentSyllableIndex: number;
  currentInput: string;
  cells: BlockCell[];
  x: number; // グリッド上の絶対座標
  y: number;
  color: string;
  isFixed: boolean;
  createdAt: number;
  shapeType: 'straight' | 'L';
  orientation: 'horizontal' | 'vertical';
}

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  char: string;
}

// ひらがなからローマ字候補へのマッピング
const SYLLABLE_MAP: Record<string, string[]> = {
  "あ": ["a"], "い": ["i", "yi"], "う": ["u", "wu"], "え": ["e", "ye"], "お": ["o"],
  "か": ["ka", "ca"], "き": ["ki"], "く": ["ku", "cu", "qu"], "け": ["ke"], "こ": ["ko", "co"],
  "さ": ["sa"], "し": ["si", "shi"], "す": ["su"], "せ": ["se"], "そ": ["so"],
  "た": ["ta"], "ち": ["ti", "chi"], "つ": ["tu", "tsu"], "て": ["te"], "と": ["to"],
  "な": ["na"], "に": ["ni"], "ぬ": ["nu"], "ね": ["ne"], "の": ["no"],
  "は": ["ha"], "ひ": ["hi"], "ふ": ["hu", "fu"], "へ": ["he"], "ほ": ["ho"],
  "ま": ["ma"], "み": ["mi"], "む": ["mu"], "め": ["me"], "も": ["mo"],
  "や": ["ya"], "ゆ": ["yu"], "よ": ["yo"],
  "ら": ["ra"], "り": ["ri"], "る": ["ru"], "れ": ["re"], "ろ": ["ro"],
  "わ": ["wa"], "を": ["wo"], "ん": ["n", "nn"],
  "が": ["ga"], "ぎ": ["gi"], "ぐ": ["gu"], "げ": ["ge"], "ご": ["go"],
  "ざ": ["za"], "じ": ["zi", "ji"], "ず": ["zu"], "ぜ": ["ze"], "ぞ": ["zo"],
  "だ": ["da"], "ぢ": ["di"], "づ": ["du"], "で": ["de"], "ど": ["do"],
  "ば": ["ba"], "び": ["bi"], "ぶ": ["bu"], "べ": ["be"], "ぼ": ["bo"],
  "ぱ": ["pa"], "ぴ": ["pi"], "ぷ": ["pu"], "ぺ": ["pe"], "ぽ": ["po"],
  "ぁ": ["xa", "la"], "ぃ": ["xi", "li"], "ぅ": ["xu", "lu"], "ぇ": ["xe", "le"], "ぉ": ["xo", "lo"],
  "ゃ": ["xya", "lya"], "ゅ": ["xyu", "lyu"], "ょ": ["xyo", "lyo"],
  "っ": ["xtu", "ltu"], "ー": ["-"],
  "きゃ": ["kya"], "きゅ": ["kyu"], "きょ": ["kyo"],
  "ぎゃ": ["gya"], "ぎゅ": ["gyu"], "ぎょ": ["gyo"],
  "しゃ": ["sya", "sha"], "しゅ": ["syu", "shu"], "しょ": ["syo", "sho"],
  "じゃ": ["zya", "ja", "jya"], "じゅ": ["zyu", "ju", "jyu"], "じょ": ["zyo", "jo", "jyo"],
  "ちゃ": ["tya", "cha"], "ちゅ": ["tyu", "chu"], "ちょ": ["tyo", "cho"],
  "にゃ": ["nya"], "にゅ": ["nyu"], "にょ": ["nyo"],
  "ひゃ": ["hya"], "ひゅ": ["hyu"], "ひょ": ["hyo"],
  "びゃ": ["bya"], "びゅ": ["byu"], "びょ": ["byo"],
  "ぴゃ": ["pya"], "ぴゅ": ["pyu"], "ぴょ": ["pyo"],
  "みゃ": ["mya"], "みゅ": ["myu"], "みょ": ["myo"],
  "りゃ": ["rya"], "りゅ": ["ryu"], "りょ": ["ryo"]
};

// 難易度別の単語リスト (3文字〜7文字)
const WORDS_BY_LENGTH: Record<number, string[]> = {
  3: ["さくら", "みかん", "りんご", "くるま", "すいか", "つくえ", "きつね", "うさぎ", "たぬき", "おかし", "ごはん", "えほん", "めがね", "ほんや", "かもめ", "ひるね", "すずめ", "おちゃ", "にほん", "いちご", "とまと", "すまほ", "さかな", "めだか", "てんき", "どうろ", "じしょ", "としょ"],
  4: ["ふうせん", "こうえん", "らいおん", "ぺんぎん", "えんぴつ", "せんせい", "たいよう", "きんぎょ", "にんじん", "きゅうり", "くつした", "おんせん", "えあこん", "おにぎり", "あおぞら", "しゃしん", "ちゅうか", "すいーつ"],
  5: ["ひこうき", "どうぶつ", "おれんじ", "ぱそこん", "がっこう", "ともだち", "ひまわり", "あさがお", "すきやき", "しいくいん", "おんどけい", "おこづかい", "けーたい", "おかいもの", "としょかん", "てんぷら"],
  6: ["しんかんせん", "おんせんがい", "どうぶつえん", "しゃしんかん", "ほっかいどう", "たんじょうび", "おしょうがつ", "うちゅうせん", "かんらんしゃ", "おんがくしつ", "すいぞくかん"],
  7: ["ぷろぐらみんぐ", "すまーとふぉん", "としょかんいん", "せんたくばさみ", "しょうがっこう"]
};

// ネオンカラーパレット（高いコントラストとカラフルさを重視）
const COLORS = [
  "bg-cyan-400 text-slate-950 font-extrabold",
  "bg-fuchsia-400 text-slate-950 font-extrabold",
  "bg-emerald-400 text-slate-950 font-extrabold",
  "bg-amber-400 text-slate-950 font-extrabold",
  "bg-pink-400 text-slate-950 font-extrabold",
  "bg-blue-400 text-slate-950 font-extrabold",
  "bg-orange-400 text-slate-950 font-extrabold"
];

// ==========================================
// 2. ヘルパー関数
// ==========================================

// 音節のパース
function parseWordToSyllables(word: string): Syllable[] {
  const syllables: Syllable[] = [];
  let i = 0;
  while (i < word.length) {
    // 促音「っ」の処理（次の文字の頭子音を重複させる）
    if (word[i] === "っ" && i + 1 < word.length) {
      const nextChar = word[i + 1];
      let nextSyllableHiragana = nextChar;
      if (i + 2 < word.length && SYLLABLE_MAP[nextChar + word[i + 2]]) {
        nextSyllableHiragana = nextChar + word[i + 2];
      }
      
      const nextRomajis = SYLLABLE_MAP[nextSyllableHiragana] || [""];
      const doubleConsonants = nextRomajis
        .map(r => r[0])
        .filter(c => c && !["a","i","u","e","o","y","-"].includes(c));
      
      if (doubleConsonants.length > 0) {
        syllables.push({
          hiragana: "っ",
          romajiOptions: [...new Set([...doubleConsonants, "xtu", "ltu"])]
        });
        i++;
        continue;
      }
    }

    // 2文字拗音
    if (i + 1 < word.length) {
      const twoChars = word.substring(i, i + 2);
      if (SYLLABLE_MAP[twoChars]) {
        syllables.push({
          hiragana: twoChars,
          romajiOptions: SYLLABLE_MAP[twoChars]
        });
        i += 2;
        continue;
      }
    }

    // 1文字
    const char = word[i];
    const options = SYLLABLE_MAP[char] || [char];
    syllables.push({
      hiragana: char,
      romajiOptions: options
    });
    i++;
  }
  return syllables;
}

// 簡易オーディオ（効果音）
const playBeep = (freq: number, type: OscillatorType, duration: number) => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Web Audio がブロックされた場合などは何もしない
  }
};

const soundSuccess = () => playBeep(587.33, 'sine', 0.15); // D5
const soundType = () => playBeep(880, 'sine', 0.05); // A5
const soundError = () => playBeep(180, 'triangle', 0.25); // low buzz
const soundGameOver = () => playBeep(220, 'sawtooth', 0.8);

// ==========================================
// 3. メインコンポーネント
// ==========================================

export default function App() {
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAME_OVER'>('START');
  
  const [blocks, setBlocksState] = useState<Block[]>([]);
  const blocksRef = useRef<Block[]>([]);
  
  const setBlocks = useCallback((newBlocks: Block[] | ((prev: Block[]) => Block[])) => {
    if (typeof newBlocks === 'function') {
      setBlocksState(prev => {
        const next = newBlocks(prev);
        blocksRef.current = next;
        return next;
      });
    } else {
      blocksRef.current = newBlocks;
      setBlocksState(newBlocks);
    }
  }, []);

  const [targetBlockId, setTargetBlockId] = useState<string | null>(null);
  
  // スコア・コンボ・時間
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  
  // 特殊演出
  const [shake, setShake] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [lastKey, setLastKey] = useState<string | null>(null);

  // ゲームループ等に必要な参照
  const gravityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 落下スピードの計算 (時間経過とともに加速、最速0.15秒、開始時は0.7秒)
  const getSpeedMs = () => {
    return Math.max(150, 700 - Math.floor(gameTime / 15) * 80);
  };

  // パーティクルの生成
  const spawnParticles = (cells: BlockCell[], blockX: number, blockY: number, color: string) => {
    const newParticles: Particle[] = [];
    cells.forEach((cell, i) => {
      const startX = blockX + cell.x;
      const startY = blockY + cell.y;
      
      // 各セルから数個の火花を散らす
      for (let k = 0; k < 5; k++) {
        newParticles.push({
          id: `${Date.now()}-${i}-${k}-${Math.random()}`,
          x: startX * 32 + 16,
          y: startY * 30 + 15,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10 - 3,
          color: color,
          char: cell.char
        });
      }
    });
    setParticles(prev => [...prev, ...newParticles].slice(-100)); // 最大100個に制限
  };

  // パーティクルアニメーション更新
  useEffect(() => {
    if (particles.length === 0) return;
    const interval = setInterval(() => {
      setParticles(prev => 
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.4, // 重力
            vx: p.vx * 0.98
          }))
          .filter(p => p.y < ROWS * 30 + 100) // 画面外に落ちたら削除
      );
    }, 30);
    return () => clearInterval(interval);
  }, [particles]);

  // 新規ブロックの生成
  const generateNewBlock = useCallback(() => {
    // 3〜7文字をランダムに決定
    const lengths = [3, 4, 5, 6, 7];
    const chosenLength = lengths[Math.floor(Math.random() * lengths.length)];
    const wordList = WORDS_BY_LENGTH[chosenLength];
    const word = wordList[Math.floor(Math.random() * wordList.length)];
    const syllables = parseWordToSyllables(word);

    // 形状と向き
    // 5文字以上は必ず横向き。3〜4文字は縦横ランダム。
    const shapeType: 'straight' | 'L' = Math.random() < 0.7 ? 'straight' : 'L';
    const orientation: 'horizontal' | 'vertical' = chosenLength >= 5 ? 'horizontal' : (Math.random() < 0.5 ? 'horizontal' : 'vertical');

    // セルの配置を決定
    const cells: BlockCell[] = [];
    if (shapeType === 'straight') {
      if (orientation === 'horizontal') {
        for (let i = 0; i < word.length; i++) {
          cells.push({ x: i, y: 0, char: word[i] });
        }
      } else {
        for (let i = 0; i < word.length; i++) {
          cells.push({ x: 0, y: i, char: word[i] });
        }
      }
    } else {
      // L字型：最後の1文字だけを下に曲げる
      if (orientation === 'horizontal') {
        for (let i = 0; i < word.length - 1; i++) {
          cells.push({ x: i, y: 0, char: word[i] });
        }
        cells.push({ x: word.length - 2, y: 1, char: word[word.length - 1] });
      } else {
        for (let i = 0; i < word.length - 1; i++) {
          cells.push({ x: 0, y: i, char: word[i] });
        }
        cells.push({ x: 1, y: word.length - 2, char: word[word.length - 1] });
      }
    }

    // 初期出現位置 (x方向をランダムに決定し偏りを無くす)
    const maxXRelative = Math.max(...cells.map(c => c.x));
    const maxPossibleX = COLUMNS - 1 - maxXRelative;
    const startX = Math.floor(Math.random() * (maxPossibleX + 1));
    const startY = 0;

    const id = `block-${Date.now()}-${Math.random()}`;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    const newBlock: Block = {
      id,
      word,
      syllables,
      currentSyllableIndex: 0,
      currentInput: "",
      cells,
      x: startX,
      y: startY,
      color,
      isFixed: false,
      createdAt: Date.now(),
      shapeType,
      orientation
    };

    return newBlock;
  }, []);

  // 衝突判定
  const checkCollision = (block: Block, nextX: number, nextY: number, fixedBlocks: Block[]) => {
    for (const cell of block.cells) {
      const gridX = nextX + cell.x;
      const gridY = nextY + cell.y;

      // 境界判定
      if (gridX < 0 || gridX >= COLUMNS || gridY >= ROWS) {
        return true;
      }

      // 既存の固定ブロックセルとの衝突
      for (const other of fixedBlocks) {
        if (other.id === block.id) continue;
        for (const otherCell of other.cells) {
          if (other.x + otherCell.x === gridX && other.y + otherCell.y === gridY) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // 全固定ブロックの浮遊・落下解決（形状維持重力）
  const applyBlockGravity = (blocksList: Block[]): { updatedBlocks: Block[], changed: boolean } => {
    let changed = false;
    
    // y方向（底に近い方）の下部にあるブロックから優先して落とすため、
    // 各ブロック内のセル絶対y座標の最大値でソート
    const fixedBlocks = blocksList.filter(b => b.isFixed).sort((a, b) => {
      const maxYa = Math.max(...a.cells.map(c => a.y + c.y));
      const maxYb = Math.max(...b.cells.map(c => b.y + c.y));
      return maxYb - maxYa; // 下（yが大きい）にあるブロックを優先
    });

    const activeBlock = blocksList.find(b => !b.isFixed);

    // どのブロックも動かなくなるまでループ
    let anyBlockMoved = true;
    while (anyBlockMoved) {
      anyBlockMoved = false;
      for (const block of fixedBlocks) {
        let canFall = true;
        const nextY = block.y + 1;
        
        // 移動先での衝突判定
        let collision = false;
        for (const cell of block.cells) {
          const checkX = block.x + cell.x;
          const checkY = nextY + cell.y;
          
          if (checkY >= ROWS) {
            collision = true;
            break;
          }
          
          // 自分以外の固定ブロックと重なるか
          const otherCollision = fixedBlocks.some(other => {
            if (other.id === block.id) return false;
            return other.cells.some(otherCell => {
              return (other.x + otherCell.x === checkX) && (other.y + otherCell.y === checkY);
            });
          });
          
          if (otherCollision) {
            collision = true;
            break;
          }
        }

        if (!collision) {
          block.y++;
          anyBlockMoved = true;
          changed = true;
        }
      }
    }

    const allUpdated = [...fixedBlocks];
    if (activeBlock) {
      allUpdated.push(activeBlock);
    }
    return { updatedBlocks: allUpdated, changed };
  };

  // ターゲットの自動決定（未タイピング、または生成が一番古いもの）
  const autoSelectTarget = (blocksList: Block[]) => {
    // すでに少しでもタイピングが進んでいるブロックがあれば最優先
    const partiallyTyped = blocksList.find(b => b.currentSyllableIndex > 0 || b.currentInput.length > 0);
    if (partiallyTyped) {
      setTargetBlockId(partiallyTyped.id);
      return;
    }

    // なければ、画面上にあるすべてのブロックから最も古い（createdAtが最小）ものを選択
    if (blocksList.length > 0) {
      const sorted = [...blocksList].sort((a, b) => a.createdAt - b.createdAt);
      setTargetBlockId(sorted[0].id);
    } else {
      setTargetBlockId(null);
    }
  };

  // ゲームオーバーループ
  const triggerGameOver = () => {
    soundGameOver();
    setGameState('GAME_OVER');
    if (gravityTimerRef.current) clearInterval(gravityTimerRef.current);
    if (timeTimerRef.current) clearInterval(timeTimerRef.current);
  };

  // ゲームオーバーラインの接触判定
  const checkGameOverCondition = (blocksList: Block[]) => {
    const fixedBlocks = blocksList.filter(b => b.isFixed);
    for (const b of fixedBlocks) {
      for (const c of b.cells) {
        if (b.y + c.y < GAME_OVER_LINE) {
          return true;
        }
      }
    }
    return false;
  };

  // ゲームの初期化
  const startGame = () => {
    setGameState('PLAYING');
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setGameTime(0);
    setTargetBlockId(null);
    setParticles([]);
    
    const initialBlock = generateNewBlock();
    const list = [initialBlock];
    setBlocks(list);
    autoSelectTarget(list);
  };

  // キーダウン（タイピング入力）の制御
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameState !== 'PLAYING') return;

    const key = e.key.toLowerCase();
    
    // タイピング対象文字以外の入力を弾く
    if (!/^[a-z\-]$/.test(key)) {
      return;
    }

    // 入力キーのアニメーション用
    setLastKey(key);
    setTimeout(() => setLastKey(null), 100);

    const currentBlocks = [...blocksRef.current];
    const targetBlockIndex = currentBlocks.findIndex(b => b.id === targetBlockId);
    
    if (targetBlockIndex === -1) {
      return;
    }

    const targetBlock = currentBlocks[targetBlockIndex];
    const currentSyllable = targetBlock.syllables[targetBlock.currentSyllableIndex];
    const proposedInput = targetBlock.currentInput + key;

    // 前方一致（プレフィックス）がローマ字候補のいずれかにあるか判定
    const hasPrefixMatch = currentSyllable.romajiOptions.some(opt => opt.startsWith(proposedInput));

    if (hasPrefixMatch) {
      // タイピング成功！
      soundType();
      targetBlock.currentInput = proposedInput;

      // 完全一致（音節完了）したか判定
      const hasExactMatch = currentSyllable.romajiOptions.find(opt => opt === proposedInput);
      
      if (hasExactMatch) {
        targetBlock.currentInput = "";
        targetBlock.currentSyllableIndex += 1;

        // 単語全体のタイピング完了！
        if (targetBlock.currentSyllableIndex >= targetBlock.syllables.length) {
          soundSuccess();
          // スコア計算: (単語文字数 * 10) + (コンボ数 * 5)
          const wordScore = (targetBlock.word.length * 10) + (combo * 5);
          setScore(prev => prev + wordScore);
          setCombo(prev => {
            const nextCombo = prev + 1;
            if (nextCombo > maxCombo) {
              setMaxCombo(nextCombo);
            }
            return nextCombo;
          });

          // 消去エフェクト用パーティクル
          spawnParticles(targetBlock.cells, targetBlock.x, targetBlock.y, targetBlock.color);

          // リストから削除
          const nextBlocks = currentBlocks.filter(b => b.id !== targetBlock.id);

          // 重力処理を適用
          const { updatedBlocks } = applyBlockGravity(nextBlocks);

          setBlocks(updatedBlocks);
          // 新ターゲット決定
          autoSelectTarget(updatedBlocks);
          return;
        }
      }
      
      // 状態更新
      setBlocks(currentBlocks);
    } else {
      // タイプミス！
      soundError();
      setCombo(0); // コンボリセット
      setShake(true);
      setTimeout(() => setShake(false), 200);
    }
  }, [targetBlockId, combo, maxCombo, gameState, generateNewBlock]);

  // イベント登録
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ゲーム時間更新タイマー
  useEffect(() => {
    if (gameState === 'PLAYING') {
      timeTimerRef.current = setInterval(() => {
        setGameTime(prev => {
          // 生存時間でスコア加算 (1秒ごとに1スコア)
          setScore(s => s + 1);
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (timeTimerRef.current) clearInterval(timeTimerRef.current);
    };
  }, [gameState]);

  // 物理＆重力処理のゲームループ
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const intervalMs = getSpeedMs();
    const timer = setInterval(() => {
      const currentBlocks = [...blocksRef.current];
      const activeBlockIndex = currentBlocks.findIndex(b => !b.isFixed);

      if (activeBlockIndex !== -1) {
        const activeBlock = currentBlocks[activeBlockIndex];
        const nextY = activeBlock.y + 1;
        const fixedBlocks = currentBlocks.filter(b => b.isFixed);

        if (checkCollision(activeBlock, activeBlock.x, nextY, fixedBlocks)) {
          // 衝突：固定状態へ
          activeBlock.isFixed = true;
          
          // 形状キープの全体重力処理
          const { updatedBlocks } = applyBlockGravity(currentBlocks);
          
          // ゲームオーバー判定
          if (checkGameOverCondition(updatedBlocks)) {
            setBlocks(updatedBlocks);
            triggerGameOver();
            return;
          }

          // 新たなブロックを投入
          const freshBlock = generateNewBlock();
          const newList = [...updatedBlocks, freshBlock];
          setBlocks(newList);
          autoSelectTarget(newList);
        } else {
          // 落下継続
          activeBlock.y = nextY;
          setBlocks(currentBlocks);
        }
      } else {
        // 落下中ブロックが無ければ新規投入
        const freshBlock = generateNewBlock();
        const newList = [...currentBlocks, freshBlock];
        setBlocks(newList);
        autoSelectTarget(newList);
      }
    }, intervalMs);

    gravityTimerRef.current = timer;

    return () => {
      clearInterval(timer);
      gravityTimerRef.current = null;
    };
  }, [gameState, Math.floor(gameTime / 15), generateNewBlock]);

  // ターゲットをマウスクリックで手動選択する
  const handleSelectTarget = (id: string) => {
    if (gameState !== 'PLAYING') return;
    setTargetBlockId(id);
    playBeep(440, 'sine', 0.1); // 高めのクリックピピ音
  };

  // フォーマット時間
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // キーボードUIの定義
  const keyboardRows = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", "-"],
    ["z", "x", "c", "v", "b", "n", "m"]
  ];

  return (
    <div className="h-screen max-h-screen bg-slate-950 flex flex-col items-center justify-between p-3 overflow-hidden select-none">
      
      {/* ヘッダータイトル */}
      <header className="w-full max-w-5xl flex items-center justify-between mb-1 py-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg shadow-lg">
            <Keyboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider font-display bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent leading-none">
              けしタイプ
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">TETRIS × TYPING PUZZLE</p>
          </div>
        </div>
        
        {/* レベル/速度インジケーター */}
        {gameState === 'PLAYING' && (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-900 border border-slate-800 rounded-full text-[11px] text-cyan-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            SPEED: {(1000 / getSpeedMs()).toFixed(1)}x
          </div>
        )}
      </header>

      {/* メインゲームボードエリア */}
      <main className={`flex-1 min-h-0 w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch overflow-hidden ${shake ? 'animate-shake' : ''}`}>
        
        {/* 左サイド：スコア・スタッツ（3/12） */}
        <section className="md:col-span-3 flex flex-col gap-3 justify-start min-h-0">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 flex flex-col gap-2 backdrop-blur-sm">
            <h3 className="text-xs font-bold text-slate-500 tracking-wider font-mono">STATUS PANEL</h3>
            
            {/* スコア */}
            <div className="flex items-center justify-between bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-slate-300">SCORE</span>
              </div>
              <span className="text-xl font-bold font-mono text-amber-400">{score}</span>
            </div>

            {/* 生存時間 */}
            <div className="flex items-center justify-between bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-slate-300">SURVIVED</span>
              </div>
              <span className="text-lg font-bold font-mono text-cyan-400">{formatTime(gameTime)}</span>
            </div>

            {/* コンボ */}
            <div className="flex items-center justify-between bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 relative overflow-hidden">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-pink-500" />
                <span className="text-xs text-slate-300">COMBO</span>
              </div>
              <div className="flex flex-col items-end">
                <span className={`text-xl font-extrabold font-mono text-pink-500 ${combo > 0 ? 'scale-110' : ''}`}>
                  {combo}
                </span>
                <span className="text-[9px] text-slate-500">MAX {maxCombo}</span>
              </div>
              {combo >= 5 && (
                <div className="absolute top-0 right-0 bg-pink-500 text-[8px] text-white font-bold px-1.5 py-0.5 rounded-bl-lg animate-bounce">
                  FEVER
                </div>
              )}
            </div>
          </div>

          {/* ターゲットブロックの詳細表示パネル */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 flex flex-col gap-2 backdrop-blur-sm">
            <h3 className="text-xs font-bold text-slate-500 tracking-wider font-mono">TARGET PREVIEW</h3>
            
            {(() => {
              const targetBlock = blocks.find(b => b.id === targetBlockId);
              if (!targetBlock) {
                return (
                  <div className="h-24 flex flex-col items-center justify-center text-slate-600 text-xs border border-dashed border-slate-800 rounded-xl">
                    <Info className="w-5 h-5 mb-1 opacity-50" />
                    ターゲットなし
                  </div>
                );
              }

              return (
                <div className="bg-slate-950/80 p-3 rounded-xl border border-pink-500/30 flex flex-col justify-center min-h-[96px] relative overflow-hidden">
                  <div className="absolute top-1.5 right-1.5 text-[8px] bg-pink-500/20 text-pink-300 font-bold px-1.5 py-0.5 rounded border border-pink-500/30">
                    TARGET ACTIVE
                  </div>
                  
                  {/* 音節ごとのひらがな＋ローマ字並列カード */}
                  <div className="flex gap-1.5 items-center mt-2 flex-wrap justify-start">
                    {targetBlock.syllables.map((syll, idx) => {
                      const isTyped = idx < targetBlock.currentSyllableIndex;
                      const isCurrent = idx === targetBlock.currentSyllableIndex;
                      
                      let romajiText = syll.romajiOptions[0];
                      let userTyped = "";
                      let remaining = romajiText;

                      if (isCurrent) {
                        userTyped = targetBlock.currentInput;
                        const bestOption = syll.romajiOptions.find(opt => opt.startsWith(userTyped)) || syll.romajiOptions[0];
                        romajiText = bestOption;
                        remaining = bestOption.substring(userTyped.length);
                      }

                      return (
                        <div
                          key={idx}
                          className={`flex flex-col items-center justify-center px-2 py-1 rounded min-w-[40px] transition-all duration-150 border ${
                            isTyped
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20 shadow-[0_0_4px_rgba(16,185,129,0.1)]'
                              : isCurrent
                              ? 'bg-pink-950 text-pink-200 border-pink-500 scale-105 shadow-[0_0_8px_rgba(236,72,153,0.5)]'
                              : 'bg-slate-900 text-slate-400 border-slate-800'
                          }`}
                        >
                          <span className={`text-base font-bold ${isTyped ? 'line-through opacity-40' : ''}`}>
                            {syll.hiragana}
                          </span>
                          <span className="text-[9px] font-mono font-bold leading-none mt-1 tracking-wider uppercase">
                            {isTyped ? (
                              <span className="line-through opacity-40">{romajiText}</span>
                            ) : isCurrent ? (
                              <>
                                <span className="text-pink-400 font-extrabold">{userTyped}</span>
                                <span className="text-slate-400">{remaining}</span>
                              </>
                            ) : (
                              <span>{romajiText}</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* 別解候補がある場合のみ小さくアシスト表示 */}
                  {(() => {
                    const currentSyll = targetBlock.syllables[targetBlock.currentSyllableIndex];
                    if (currentSyll && currentSyll.romajiOptions.length > 1) {
                      return (
                        <div className="text-[9px] text-slate-500 font-mono mt-2">
                          ALT INPUTS: {currentSyll.romajiOptions.join(' / ')}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              );
            })()}
          </div>
        </section>

        {/* 中央：テトリス風グリッド（5/12） */}
        <section className="md:col-span-5 flex justify-center">
          <div className="relative border-4 border-slate-800 bg-slate-950 rounded-2xl overflow-hidden shadow-2xl"
               style={{ width: '324px', height: '608px' }}>
            
            {/* ゲームオーバーライン（警告ライン） */}
            <div className="absolute left-0 right-0 border-b-2 border-dashed border-red-500/50 pointer-events-none z-10"
                 style={{ top: `${GAME_OVER_LINE * 30}px` }}>
              <div className="absolute right-2 top-0.5 text-[8px] font-bold text-red-400/60 font-mono tracking-wider">
                GAME OVER LINE
              </div>
            </div>

            {/* グリッド背景ドット */}
            <div className="absolute inset-0 grid grid-cols-10 grid-rows-20 pointer-events-none opacity-5">
              {Array.from({ length: 200 }).map((_, i) => (
                <div key={i} className="border-r border-b border-slate-700" />
              ))}
            </div>

            {/* 画面上のブロック描画 */}
            <div className="absolute inset-0">
              {blocks.map((block) => {
                const isActiveTarget = block.id === targetBlockId;
                const isFirstSyllableTyped = block.currentSyllableIndex > 0 || block.currentInput.length > 0;
                
                return (
                  <div
                    key={block.id}
                    className="absolute transition-all duration-75 cursor-pointer"
                    style={{
                      left: `${block.x * 32}px`,
                      top: `${block.y * 30}px`,
                    }}
                    onClick={() => handleSelectTarget(block.id)}
                  >
                    {block.cells.map((cell, cIdx) => {
                      // 現在のセルに格納された文字が、入力済み部分に含まれるか判定
                      const syllableIndex = block.cells.findIndex(c => c === cell);
                      const isLetterTyped = syllableIndex < block.currentSyllableIndex;
                      const isCurrentLetter = syllableIndex === block.currentSyllableIndex;

                      // 境界線がハッキリ見えるよう、太枠「border-2 border-slate-950」をデフォルトにし、個々のセルの色合いを最適化
                      let cellStyle = `border-2 border-slate-950 ${block.color}`;
                      
                      if (isActiveTarget) {
                        if (isLetterTyped) {
                          cellStyle = "border-2 border-slate-950 bg-emerald-500 text-slate-950 font-black shadow-[0_0_8px_rgba(16,185,129,0.6)] line-through opacity-50";
                        } else if (isCurrentLetter) {
                          cellStyle = "border-2 border-pink-500 bg-white text-pink-600 font-extrabold shadow-[0_0_12px_rgba(236,72,153,0.8)] scale-105 animate-pulse z-10";
                        } else {
                          cellStyle = "border-2 border-slate-950 bg-pink-400 text-slate-950 font-bold shadow-[0_0_8px_rgba(244,114,182,0.4)]";
                        }
                      } else if (isFirstSyllableTyped) {
                        cellStyle = "border-2 border-slate-950 bg-amber-400 text-slate-950 font-bold opacity-80 shadow-[0_0_8px_rgba(251,191,36,0.5)]";
                      }

                      return (
                        <div
                          key={cIdx}
                          className={`absolute w-[32px] h-[30px] flex items-center justify-center font-bold text-sm rounded shadow-md transition-all duration-100 ${cellStyle}`}
                          style={{
                            left: `${cell.x * 32}px`,
                            top: `${cell.y * 30}px`,
                          }}
                        >
                          {cell.char}
                          
                          {/* ターゲットマーク */}
                          {isActiveTarget && syllableIndex === block.currentSyllableIndex && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-pink-500 rounded-full animate-ping" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* 火花パーティクル */}
            <div className="absolute inset-0 pointer-events-none">
              {particles.map((p) => (
                <span
                  key={p.id}
                  className="absolute font-bold text-xs pointer-events-none drop-shadow"
                  style={{
                    left: `${p.x}px`,
                    top: `${p.y}px`,
                    color: p.color.includes('cyan') ? '#22d3ee' : p.color.includes('violet') ? '#a78bfa' : p.color.includes('emerald') ? '#34d399' : p.color.includes('amber') ? '#fbbf24' : '#6366f1',
                    transform: 'translate(-50%, -50%)',
                    textShadow: '0 0 5px currentColor'
                  }}
                >
                  {p.char}
                </span>
              ))}
            </div>

            {/* ゲーム状態に応じたオーバーレイ画面 */}
            <AnimatePresence>
              {gameState === 'START' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-20"
                >
                  <div className="text-center flex flex-col items-center gap-4">
                    <div className="p-4 bg-gradient-to-tr from-pink-500 to-purple-600 rounded-full shadow-lg shadow-purple-500/20 animate-pulse">
                      <Keyboard className="w-10 h-10 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-extrabold font-display text-white tracking-widest mb-1">
                        けしタイプ
                      </h2>
                      <p className="text-xs text-slate-400 font-mono">
                        FALLING WORD MATCH PUZZLE
                      </p>
                    </div>
                    
                    {/* ゲーム解説 */}
                    <div className="my-4 text-xs text-slate-300 leading-relaxed text-left bg-slate-900 border border-slate-800 p-4 rounded-xl max-w-[280px]">
                      <p className="font-bold text-center text-pink-400 mb-2">ルール説明</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>上からひらがなのブロックが落ちてきます。</li>
                        <li>ブロックの文字（ひらがな）をキーボードでタイピングして消去！</li>
                        <li>ブロックをクリックして、自由に狙うターゲットを切り替えられます。</li>
                        <li>ラインを超えるとゲームオーバー！</li>
                        <li>タイプミスをするとコンボが途切れます。</li>
                      </ul>
                    </div>

                    <button
                      onClick={startGame}
                      className="group relative px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      GAME START
                    </button>
                  </div>
                </motion.div>
              )}

              {gameState === 'GAME_OVER' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 z-20"
                >
                  <div className="text-center flex flex-col items-center gap-4">
                    <div className="p-4 bg-red-500/20 border border-red-500 rounded-full shadow-lg shadow-red-500/20">
                      <AlertTriangle className="w-10 h-10 text-red-500" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-extrabold font-display text-red-500 tracking-wider mb-1">
                        GAME OVER
                      </h2>
                      <p className="text-xs text-slate-400 font-mono">
                        BLOCKS BREACHED THE LINE
                      </p>
                    </div>

                    {/* スコアまとめ */}
                    <div className="my-4 w-full bg-slate-900 border border-slate-800 p-4 rounded-xl font-mono text-left max-w-[280px]">
                      <div className="flex justify-between border-b border-slate-800 pb-2 mb-2">
                        <span className="text-slate-400">FINAL SCORE:</span>
                        <span className="text-amber-400 font-bold">{score}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800 pb-2 mb-2">
                        <span className="text-slate-400">SURVIVED:</span>
                        <span className="text-cyan-400 font-bold">{formatTime(gameTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">MAX COMBO:</span>
                        <span className="text-pink-500 font-bold">{maxCombo} Lnk</span>
                      </div>
                    </div>

                    <button
                      onClick={startGame}
                      className="group relative px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <RotateCcw className="w-5 h-5" />
                      PLAY AGAIN
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* 右サイド：プレイガイド・ゲーム説明・ビジュアルキーボード（4/12） */}
        <section className="md:col-span-4 flex flex-col gap-2.5 justify-start min-h-0">
          
          {/* ローマ字入力ルール・ヘルプ */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 backdrop-blur-sm">
            <h3 className="text-xs font-bold text-slate-500 tracking-wider font-mono mb-1.5">TYPING RULES</h3>
            <ul className="text-[10px] text-slate-400 space-y-1.5">
              <li className="flex items-start gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>揺れ入力対応</strong>: 「し」は <code className="text-cyan-400 font-bold">si</code>/<code className="text-cyan-400 font-bold">shi</code>, 「じ」は <code className="text-cyan-400 font-bold">zi</code>/<code className="text-cyan-400 font-bold">ji</code>, 「ち」は <code className="text-cyan-400 font-bold">ti</code>/<code className="text-cyan-400 font-bold">chi</code> など複数の入力に対応。</span>
              </li>
              <li className="flex items-start gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>「っ」の入力</strong>: 子音を重ねる（「っか」で <code className="text-cyan-400 font-bold">k</code>）か、単体入力（<code className="text-cyan-400 font-bold">xtu</code>/<code className="text-cyan-400 font-bold">ltu</code>）。</span>
              </li>
              <li className="flex items-start gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>ターゲット選択</strong>: 溜まったブロックをマウスクリックで狙い撃ち可能！</span>
              </li>
            </ul>
          </div>

          {/* コンボ効果 */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 backdrop-blur-sm">
            <h3 className="text-xs font-bold text-slate-500 tracking-wider font-mono mb-1">FEVER BONUS</h3>
            <div className="flex gap-2 items-center">
              <div className="p-1 bg-pink-500/10 rounded border border-pink-500/20 text-pink-500 shrink-0">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                正しく打つとコンボ増加！1コンボごとに獲得スコアが <strong>+5ポイント</strong> 加算されます（ミスでリセット）。
              </p>
            </div>
          </div>

          {/* ビジュアルキーボードUI */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 backdrop-blur-sm flex flex-col gap-1.5">
            <h3 className="text-xs font-bold text-slate-500 tracking-wider font-mono">VISUAL KEYBOARD</h3>
            <div className="flex flex-col gap-1 items-center bg-slate-950/40 p-2 rounded-lg border border-slate-800/50 w-full">
              {keyboardRows.map((row, rIdx) => (
                <div key={rIdx} className="flex gap-0.5 justify-center w-full">
                  {row.map((char) => {
                    const isPressed = lastKey === char;
                    return (
                      <kbd
                        key={char}
                        className={`w-5 h-5.5 sm:w-6 sm:h-6.5 flex items-center justify-center rounded text-[8px] sm:text-[10px] font-mono font-bold border transition-all duration-75 uppercase grow ${
                          isPressed
                            ? 'bg-pink-500 border-pink-400 text-white scale-90 shadow-lg shadow-pink-500/50'
                            : 'bg-slate-950 border-slate-800 text-slate-500'
                        }`}
                      >
                        {char}
                      </kbd>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

    </div>
  );
}

