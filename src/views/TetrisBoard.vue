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
      <button @click="startGame" :disabled="isPlaying">开始游戏</button>
      <!-- 暂停游戏按钮，仅在游戏进行时可用 -->
      <button @click="pauseGame" :disabled="!isPlaying">暂停游戏</button>
      <!-- 游戏结束提示，仅在游戏结束时显示 -->
      <div v-if="gameOver" class="game-over">游戏结束!</div>
    </div>

    <!-- 游戏主面板：显示方块和网格 -->
    <div
      class="game-board"
      ref="gameBoard"
      tabindex="0"
      @keydown="handleKeydown"
    >
      <!-- 遍历游戏矩阵的每一行 -->
      <div v-for="(row, i) in gameMatrix" :key="i" class="row">
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
// 导入必要的 Vue 组合式 API 函数
import { ref, onMounted, onUnmounted } from "vue";

// 游戏基本配置常量
const ROW = 20; // 游戏面板的行数
const COL = 10; // 游戏面板的列数
const INTERVAL = 1000; // 方块下落的时间间隔（毫秒）

// 使用 ref 创建响应式游戏状态变量
const score = ref(0); // 游戏分数
const level = ref(1); // 游戏等级
const isPlaying = ref(false); // 游戏是否正在进行
const gameMatrix = ref(
  // 初始化游戏矩阵，所有单元格值为0
  Array(ROW)
    .fill()
    .map(() => Array(COL).fill(0))
);
const currentPiece = ref(null); // 当前活动方块
const gameInterval = ref(null); // 游戏循环定时器 定时器返回一个整数 这里如果写0 则不能清晰的表明gameInterval是否有值了 所以null更好一些
const gameOver = ref(false); // 游戏是否结束
const nextPiece = ref(null); // 下一个方块
const nextPieceMatrix = ref(
  // 初始化预览矩阵，4x4的空矩阵
  Array(4)
    .fill()
    .map(() => Array(4).fill(0))
);

// 定义所有可能的方块形状
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

// 开始游戏函数
const startGame = () => {
  if (isPlaying.value) return; // 如果游戏已在进行中，直接返回
  resetGame(); // 重置游戏状态
  isPlaying.value = true; // 设置游戏状态为进行中
  gameOver.value = false; // 重置游戏结束状态
  generateNextPiece(); // 生成下一个方块
  spawnNewPiece(); // 生成当前方块
  startGameLoop(); // 启动游戏循环
};

// 暂停游戏函数
const pauseGame = () => {
  isPlaying.value = false; // 设置游戏状态为暂停
  if (gameInterval.value) {
    clearInterval(gameInterval.value); // 清除游戏循环定时器
    gameInterval.value = null;
  }
};

// 启动游戏循环
const startGameLoop = () => {
  gameInterval.value = setInterval(() => {
    if (!isPlaying.value) return; // 如果游戏暂停，不执行
    moveDown(); // 方块自动下落
    renderCurrentPiece(); // 重新渲染当前方块
  }, INTERVAL);
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
    isPlaying.value = false;
    if (gameInterval.value) {
      clearInterval(gameInterval.value);
      gameInterval.value = null;
    }
    return;
  }

  generateNextPiece(); // 生成下一个方块
  renderCurrentPiece(); // 渲染当前方块
};

// 生成下一个方块
const generateNextPiece = () => {
  const shapes = Object.keys(SHAPES); // 获取所有可能的方块形状
  const randomShape = shapes[Math.floor(Math.random() * shapes.length)]; // 随机选择一个形状
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

  // 将方块形状渲染到预览矩阵中
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
  if (!isPlaying.value || gameOver.value) return; // 游戏未进行或已结束时不响应

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

  renderCurrentPiece(); // 渲染最终位置
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
  currentPiece.value = null; // 清除当前方块
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
  // 检查移动后是否会发生碰撞
  if (!checkCollision(currentPiece.value.shape, newX, currentPiece.value.y)) {
    currentPiece.value.x = newX;
    renderCurrentPiece();
  }
};

// 向右移动
const moveRight = () => {
  if (!currentPiece.value) return;
  const newX = currentPiece.value.x + 1;
  // 检查移动后是否会发生碰撞
  if (!checkCollision(currentPiece.value.shape, newX, currentPiece.value.y)) {
    currentPiece.value.x = newX;
    renderCurrentPiece();
  }
};

// 向下移动
const moveDown = () => {
  if (!currentPiece.value) return;
  const newY = currentPiece.value.y + 1;
  // 检查移动后是否会发生碰撞
  if (!checkCollision(currentPiece.value.shape, currentPiece.value.x, newY)) {
    currentPiece.value.y = newY;
    renderCurrentPiece();
  } else {
    lockPiece(); // 如果发生碰撞，锁定当前方块
  }
};

// 旋转方块
const rotate = () => {
  if (!currentPiece.value) return;

  // 计算旋转后的形状（矩阵转置后反转每一行）
  const rotated = currentPiece.value.shape[0].map((_, i) =>
    currentPiece.value.shape.map((row) => row[row.length - 1 - i])
  );

  // 检查旋转后是否会发生碰撞
  if (!checkCollision(rotated, currentPiece.value.x, currentPiece.value.y)) {
    currentPiece.value.shape = rotated;
    renderCurrentPiece();
  }
};

// 检查并清除完整的行
const checkLines = () => {
  let linesCleared = 0;

  for (let i = ROW - 1; i >= 0; i--) {
    // 检查是否整行都被占用
    if (gameMatrix.value[i].every((cell) => cell === 2)) {
      // 移除完整的行
      gameMatrix.value.splice(i, 1);
      // 在顶部添加新的空行
      gameMatrix.value.unshift(Array(COL).fill(0));
      linesCleared++;
      i++; // 重新检查当前行，因为上面的行已经下移
    }
  }

  // 更新分数和等级
  if (linesCleared > 0) {
    score.value += linesCleared * 100 * level.value;
    // 每清除10行升一级
    level.value = Math.floor(score.value / 1000) + 1;
  }
};

// 渲染当前方块到游戏矩阵
const renderCurrentPiece = () => {
  if (!currentPiece.value) return;

  // 清除之前的活动方块（值为1的格子）
  for (let i = 0; i < ROW; i++) {
    for (let j = 0; j < COL; j++) {
      if (gameMatrix.value[i][j] === 1) {
        gameMatrix.value[i][j] = 0;
      }
    }
  }

  // 渲染当前方块
  const { shape, x, y } = currentPiece.value;
  for (let i = 0; i < shape.length; i++) {
    for (let j = 0; j < shape[i].length; j++) {
      if (shape[i][j] && y + i >= 0) {
        gameMatrix.value[y + i][x + j] = 1;
      }
    }
  }
};

// 组件挂载时添加键盘事件监听
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

  /* 活动方块样式 */
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

    /* 禁用状态样式 */
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
</style>
