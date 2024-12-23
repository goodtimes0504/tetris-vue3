<template>
  <!-- 游戏主容器，包含所有游戏元素 -->
  <div class="tetris-container">
    <!-- 游戏信息区域：显示分数、等级和控制按钮 -->
    <div class="game-info">
      <!-- 显示当前分数 -->
      <div class="score">分数：{{ score }}</div>
      <!-- 显示当前等级 -->
      <div class="level">等级：{{ level }}</div>
      <!-- 开始游戏按钮，当游戏进行时禁用 -->
      <button @click="startGame" :disabled="gameState === GameState.PLAYING">
        开始游戏
      </button>
      <!-- 暂停游戏按钮，仅在游戏进行时可用 -->
      <button @click="pauseGame" :disabled="gameState !== GameState.PLAYING">
        暂停游戏
      </button>
      <!-- 游戏结束提示，仅在游戏结束时显示 -->
      <div v-if="gameState === GameState.GAME_OVER" class="game-over">
        游戏结束!
      </div>
      <div class="combo" v-if="comboCount > 0">
        连击：{{ comboCount }}
        <span v-if="comboCount >= 10" class="super-combo">超神！</span>
        <span v-else-if="comboCount >= 5" class="great-combo">好厉�����！</span>
      </div>
      <div class="max-combo">最高连击：{{ maxCombo }}</div>
    </div>

    <!-- 游戏主面板：显示方块和网格 -->
    <div
      class="game-board"
      ref="gameBoard"
      tabindex="0"
      @keydown="handleKeydown"
      @focus="handleFocus"
      @blur="handleBlur"
    >
      <!-- 遍历游戏矩阵的每一行 -->
      <div v-for="(row, i) in computedMatrix" :key="i" class="row">
        <!-- 遍历每一行的每个单元格 -->
        <div
          v-for="(cell, j) in row"
          :key="j"
          class="cell"
          :class="{ active: cell === 1, occupied: cell === 2 }"
        ></div>
      </div>
    </div>

    <!-- 下一个方块预览区域 -->
    <div class="next-piece">
      <h3>下一个：</h3>
      <!-- 预览面板 -->
      <div class="preview-board">
        <!-- 遍历预览矩阵的每一行 -->
        <div v-for="(row, i) in nextPieceMatrix" :key="i" class="row">
          <!-- 遍历预览矩阵的每个单元格 -->
          <div
            v-for="(cell, j) in row"
            :key="j"
            class="cell"
            :class="{ active: cell === 1 }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// 1. 先导入必要的 Vue API
import { ref, onMounted, onUnmounted, computed } from "vue";

// 2. 定义游戏状态枚举（移到最前面）
const GameState = {
  IDLE: "idle",
  PLAYING: "playing",
  PAUSED: "paused",
  GAME_OVER: "gameOver",
};

// 3. 游戏基本配置常量
const ROW = 20;
const COL = 10;
const INTERVAL = 1000;

// 4. 创建响应式状态
const score = ref(0);
const level = ref(1);
const gameState = ref(GameState.IDLE);
const gameMatrix = ref(
  Array(ROW)
    .fill()
    .map(() => Array(COL).fill(0))
);
const currentPiece = ref(null);
const gameInterval = ref(null);
const gameOver = ref(false);
const nextPiece = ref(null);
const nextPieceMatrix = ref(
  Array(4)
    .fill()
    .map(() => Array(4).fill(0))
);

// 5. 定义所有可能的方块形状
const SHAPES = {
  I: [[1, 1, 1, 1]], // I形方块
  O: [
    // O形方块
    [1, 1],
    [1, 1],
  ],
  T: [
    // T形方块
    [0, 1, 0],
    [1, 1, 1],
  ],
  L: [
    // L形方块
    [1, 0],
    [1, 0],
    [1, 1],
  ],
  J: [
    // J形方块
    [0, 1],
    [0, 1],
    [1, 1],
  ],
  S: [
    // S形方块
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    // Z形方块
    [1, 1, 0],
    [0, 1, 1],
  ],
};

// 添加连击计数器
const comboCount = ref(0);
const maxCombo = ref(0);

// 添加对游戏面板的引用
const gameBoard = ref(null);

// 开始游戏函数
const startGame = () => {
  if (gameState.value === GameState.PLAYING) return;
  resetGame();
  gameState.value = GameState.PLAYING;
  generateNextPiece();
  spawnNewPiece();
  startGameLoop();
};

// 暂停游戏函数
const pauseGame = () => {
  if (gameState.value !== GameState.PLAYING) return;
  gameState.value = GameState.PAUSED;
};

// 启动游戏循环
const startGameLoop = () => {
  // 根据等级调整下落速度
  const currentInterval = INTERVAL / (1 + (level.value - 1) * 0.2);
  gameInterval.value = setInterval(() => {
    if (gameState.value !== GameState.PLAYING) return;
    moveDown();
  }, currentInterval);
};

// 生成新的当前方块
const spawnNewPiece = () => {
  if (!nextPiece.value) {
    generateNextPiece(); // 如果没有下一个方块，先生成一个
  }

  // 设置新方块的初始位置
  currentPiece.value = {
    shape: nextPiece.value.shape,
    x: Math.floor(COL / 2) - Math.floor(nextPiece.value.shape[0].length / 2),
    y: 0,
  };

  // 检查游戏是否结束（新方块生成时就发生碰撞）
  if (
    checkCollision(
      currentPiece.value.shape,
      currentPiece.value.x,
      currentPiece.value.y
    )
  ) {
    gameOver.value = true;
    if (gameInterval.value) {
      clearInterval(gameInterval.value);
      gameInterval.value = null;
    }
    return;
  }

  generateNextPiece(); // 生成下一个方块
};

// 生成下一个方块
const generateNextPiece = () => {
  const shapes = Object.keys(SHAPES); // 获取所有可能的方块形状
  const randomShape = shapes[Math.floor(Math.random() * shapes.length)]; // 随机选择一个形状 shapes 是一个数组里面有所有的形状的key randomShape

  nextPiece.value = {
    shape: SHAPES[randomShape],
    type: randomShape,
  };
  renderNextPiece(); // 渲染预览区域的下一个方块
};

// 渲染预览区域的下一个方块
const renderNextPiece = () => {
  // 清空预览矩阵
  nextPieceMatrix.value = Array(4)
    .fill()
    .map(() => Array(4).fill(0));

  const shape = nextPiece.value.shape;
  // 计算居中偏移量
  const offsetX = Math.floor((4 - shape[0].length) / 2);
  const offsetY = Math.floor((4 - shape.length) / 2);

  // 将方块形状渲染到预览矩阵中 一维的是y 二维的是x
  for (let i = 0; i < shape.length; i++) {
    for (let j = 0; j < shape[i].length; j++) {
      if (shape[i][j]) {
        nextPieceMatrix.value[i + offsetY][j + offsetX] = 1;
      }
    }
  }
};

// 处理键盘事件
const handleKeydown = (e) => {
  // 只有在游戏进行中才响应键盘事件
  if (gameState.value !== GameState.PLAYING) return;

  switch (e.key) {
    case "ArrowLeft": // 左箭头：向左移动
      moveLeft();
      break;
    case "ArrowRight": // 右箭头：向右移动
      moveRight();
      break;
    case "ArrowDown": // 下箭头：向下移动
      moveDown();
      break;
    case "ArrowUp": // 上箭头：旋转
      rotate();
      break;
    case " ": // 空格键：快速下落
      hardDrop();
      break;
  }
};

// 快速下落功能
const hardDrop = () => {
  if (!currentPiece.value) return;

  // 持续下落直到碰撞
  while (
    !checkCollision(
      currentPiece.value.shape,
      currentPiece.value.x,
      currentPiece.value.y + 1
    )
  ) {
    currentPiece.value.y++;
  }

  lockPiece(); // 锁定方块
};

// 重置游戏状态
const resetGame = () => {
  score.value = 0; // 重置分数
  level.value = 1; // 重置等级
  gameOver.value = false; // 重置游戏结束状态
  // 清空游戏矩阵
  gameMatrix.value = Array(ROW)
    .fill()
    .map(() => Array(COL).fill(0));
  currentPiece.value = null; // 清除当前块
  nextPiece.value = null; // 清除下一个方块
  // 清空预览矩阵
  nextPieceMatrix.value = Array(4)
    .fill()
    .map(() => Array(4).fill(0));
};

// 检查碰撞
const checkCollision = (piece, x, y) => {
  for (let i = 0; i < piece.length; i++) {
    for (let j = 0; j < piece[i].length; j++) {
      if (piece[i][j]) {
        const newX = x + j;
        const newY = y + i;

        // 检查边界碰撞
        if (newX < 0 || newX >= COL || newY >= ROW) {
          return true;
        }

        // 检查与其他方块的碰撞
        // 只在方块在游戏区域内时检查方块碰撞
        // newY < 0 说明方块还在游戏区域上方，比如l形状,此时无需检查碰撞
        if (newY >= 0 && gameMatrix.value[newY][newX] === 2) {
          return true;
        }
      }
    }
  }
  return false;
};

// 将当前方块固定到游戏面板上
const lockPiece = () => {
  const { shape, x, y } = currentPiece.value;
  // 将当前方块的位置标记为已占用（值为2）
  for (let i = 0; i < shape.length; i++) {
    for (let j = 0; j < shape[i].length; j++) {
      if (shape[i][j]) {
        gameMatrix.value[y + i][x + j] = 2;
      }
    }
  }
  checkLines(); // 检查是否有可消除的行
  spawnNewPiece(); // 生成新的方块
};

// 向左移动
const moveLeft = () => {
  if (!currentPiece.value) return;
  const newX = currentPiece.value.x - 1;
  if (!checkCollision(currentPiece.value.shape, newX, currentPiece.value.y)) {
    currentPiece.value.x = newX;
  }
};

// 向右移动
const moveRight = () => {
  if (!currentPiece.value) return;
  const newX = currentPiece.value.x + 1;
  if (!checkCollision(currentPiece.value.shape, newX, currentPiece.value.y)) {
    currentPiece.value.x = newX;
  }
};

// 向下移动
const moveDown = () => {
  if (!currentPiece.value) return;
  const newY = currentPiece.value.y + 1;
  if (!checkCollision(currentPiece.value.shape, currentPiece.value.x, newY)) {
    currentPiece.value.y = newY;
  } else {
    lockPiece();
  }
};

// 旋转方块
const rotate = () => {
  if (!currentPiece.value) return;

  const rotated = currentPiece.value.shape[0].map((_, i) => {
    const reversed = [...currentPiece.value.shape].reverse();
    return reversed.map((row) => row[i]);
  });

  if (!checkCollision(rotated, currentPiece.value.x, currentPiece.value.y)) {
    currentPiece.value.shape = rotated;
  }
};

// 检查并清除完整行
const checkLines = () => {
  let linesCleared = 0;

  for (let i = ROW - 1; i >= 0; i--) {
    if (gameMatrix.value[i].every((cell) => cell === 2)) {
      gameMatrix.value.splice(i, 1);
      gameMatrix.value.unshift(new Array(COL).fill(0));
      linesCleared++;
      i++;
    }
  }

  // 计算分数
  if (linesCleared > 0) {
    // 基础分数计算
    const baseScore = 100;
    const lineCombo = {
      1: 1, // 1行
      2: 2.5, // 2行
      3: 4, // 3行
      4: 6, // 4行
    };

    // 连击奖励系统
    comboCount.value++;
    maxCombo.value = Math.max(maxCombo.value, comboCount.value);

    // 连击加成倍率
    let comboMultiplier = 1;
    if (comboCount.value >= 10) {
      comboMultiplier = 3; // 10连击及以上 3倍分数
    } else if (comboCount.value >= 5) {
      comboMultiplier = 2; // 5-9连击 2倍分数
    } else if (comboCount.value >= 3) {
      comboMultiplier = 1.5; // 3-4连击 1.5倍分数
    }

    // 最终分数计算
    const finalScore = Math.floor(
      baseScore * lineCombo[linesCleared] * level.value * comboMultiplier
    );

    score.value += finalScore;
    level.value = Math.floor(score.value / 1000) + 1;
  } else {
    // 没有消除行，重置连击
    comboCount.value = 0;
  }
};

// 修改焦点管理函数
const handleFocus = () => {
  if (gameState.value !== GameState.PLAYING) return;
  // 使用可选链操作符，避免 gameBoard.value 为 null 时的错误
  // .focus() 是DOM元素的方法，用于使元素获得焦点
  gameBoard.value?.focus();
};

const handleBlur = () => {
  if (gameState.value === GameState.PLAYING) {
    pauseGame();
  }
};

// 组挂载时添加键盘事件监听
onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

// 组件卸载时移除键盘事件监听并清理定时器
onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
  if (gameInterval.value) {
    clearInterval(gameInterval.value);
  }
});

// 使用计算属性优化渲染
const computedMatrix = computed(() => {
  const matrix = gameMatrix.value.map((row) => [...row]);
  if (currentPiece.value) {
    const { shape, x, y } = currentPiece.value;
    for (let i = 0; i < shape.length; i++) {
      for (let j = 0; j < shape[0].length; j++) {
        if (shape[i][j] && y + i >= 0) {
          matrix[y + i][x + j] = 1;
        }
      }
    }
  }
  return matrix;
});
</script>

<style lang="scss" scoped>
/* 游戏容器样式 */
.tetris-container {
  display: flex;
  justify-content: center;
  padding: 20px;
  gap: 20px;
}

/* 游戏主面板样式 */
.game-board {
  border: 2px solid #333;
  background-color: #f0f0f0;
  padding: 2px;
  outline: none;
}

/* 行样式 */
.row {
  display: flex;
}

/* 单元格样式 */
.cell {
  width: 30px;
  height: 30px;
  border: 1px solid #ccc;

  box-sizing: border-box;

  /* 活动方块样�� */
  &.active {
    background-color: #42b983;
    border-color: #2c3e50;
  }

  /* 已固定方块样式 */
  &.occupied {
    background-color: #666;
    border-color: #2c3e50;
  }
}

/* 游戏信息区域样式 */
.game-info {
  display: flex;
  flex-direction: column;
  gap: 10px;

  /* 按钮样式 */
  button {
    padding: 10px;
    background-color: #42b983;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;

    /* 禁用态样式 */
    &:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }
  }
}

/* 下一个方块预览区域样式 */
.next-piece {
  border: 2px solid #333;
  padding: 10px;
}

/* 预览面板样式 */
.preview-board {
  width: 120px;
  height: 120px;
  border: 1px solid #ccc;
  background-color: #f8f8f8;
  padding: 10px;

  /* 预览区域单元格样式 */
  .cell {
    width: 25px;
    height: 25px;
  }
}

/* 游戏结束提示样式 */
.game-over {
  margin-top: 20px;
  padding: 10px;
  background-color: #ff4444;
  color: white;
  text-align: center;
  border-radius: 4px;
  font-weight: bold;
}

.combo {
  font-size: 1.2em;
  font-weight: bold;
  color: #e44d26;

  .super-combo {
    color: #ff0000;
    animation: pulse 0.5s infinite;
  }

  .great-combo {
    color: #ff6b6b;
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

.max-combo {
  font-size: 0.9em;
  color: #666;
}
</style>
