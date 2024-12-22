<template>
  <!-- 最外面的大盒子 -->
  <div class="tetris-container">
    <!-- 游戏信息区域 -->
    <div class="game-info">
      <div class="score">分数:{{ score }}</div>
      <div class="level">等级:{{ level }}</div>
      <!-- 开始游戏按钮，当游戏进行时禁用 -->
      <button @click="startGame" :disabled="isPlaying">开始游戏</button>
      <!-- 暂停游戏按钮，仅在游戏进行时可用 -->
      <button @click="pauseGame" :disabled="!isPlaying">暂停游戏</button>
      <!-- 游戏结束提示，仅在游戏结束时显示 -->
      <div v-if="gameOver" class="game-over">游戏结束!</div>
    </div>

    <!-- 游戏主区域 -->
    <div class="game-board" tabindex="0" @keydown="handleKeydown">
      <!-- 遍历游戏矩阵每一个单元格 两次for循环 外层是数组里每个row行 内层是row数组里的每个cell单元格 i j是下标index -->
      <div v-for="(row, i) in gameMatrix" :key="i" class="row">
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
        <!-- 遍历下一个方块的预览矩阵 -->
        <div v-for="(row, i) in nextPieceMatrix" :key="i" class="row">
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
import { ref } from 'vue'
//游戏基础配置
//游戏有多少行
const row = 20
//游戏有多少列
const col = 10
//游戏下落间隔
// const interval = 1000
// 使用 ref 创建响应式游戏状态变量 响应式变量就是数据变的时候 页面会重新渲染
const score = ref(0)
const level = ref(1)
const isPlaying = ref(false) //游戏是否开始了

//游戏矩阵，用于记录游戏中的方块 是一个二维数据 0表示空 1表示有方块
//游戏矩阵里的0 1每隔一秒变动一次 需要是响应式数据 来不断地渲染页面 所以加了ref
//之后每次游戏矩阵变动的时候，页面都会重新渲染
const gameMatrix = ref(
  // 初始化游戏矩阵，所有单元格值为0
  Array(row)
    .fill()
    .map(() => Array(col).fill(0))
)
const currentPiece = ref(null) //当前正在下落的方块 是一个对象 包含形状shape 和位置x y
const gameInterval = ref(null) //游戏定时器时器返回一个整数 这里如果写0 则不能清晰的表明gameInterval是否有值了 所以null更好一些
const gameOver = ref(false) //游戏是否结束 布尔值最合适
const nextPiece = ref(null) //下一个方块
const nextPieceMatrix = ref(
  Array(4)
    .fill()
    .map(() => Array(4).fill(0))
) //初始化预览矩阵 4x4的空矩阵
//定义游戏中的方块形状 因为是二维平面 所以可用二维数组来代表形状
const shapes = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [[1, 0, 0]],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
}
</script>

<style lang="scss" scoped>
// 游戏容器样式
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
  // 去除焦点的默认轮廓线
  outline: none;
}
/* 行样式 */
.row {
  // 行内元素水平排列
  display: flex;
}
/* 单元格样式 */
.cell {
  width: 30px;
  height: 30px;
  border: 1px solid #ccc;
  // 让单元格的宽高包含内边距和边框 方便计算
  box-sizing: border-box;
  /* 活动方块样式 &表示既有cell类又有active的情况下的元素 */
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
    &.disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }
  }
}
/* 下一个方块预览区域样式 */
.next-piece {
  border: 1px solid #333;
  padding: 10px;
}
// 预览面板样式
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
</style>
