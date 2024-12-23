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
import { onMounted, onUnmounted, ref } from 'vue'
//游戏基础配置
//游戏有多少行
const row = 20
//游戏有多少列
const col = 10
//游戏下落间隔
const interval = 1000
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
const SHAPES = {
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
  J: [
    // J形方块
    [0, 1],
    [0, 1],
    [1, 1],
  ],
  L: [
    // L形方块
    [1, 0],
    [1, 0],
    [1, 1],
  ],
}
//开始游戏函数
const startGame = () => {
  //如果游戏已经开始，则不执行
  if (isPlaying.value) return
  //重置游戏状态
  resetGame()
  //重置游戏状态变量为true
  isPlaying.value = true
  //重置gameOver变量为false
  gameOver.value = false
  //生成下一个方块
  generateNextPiece()
  //生成渲染出当前方块
  spawnNewPiece()
  //启动游戏循环
  startGameLoop()
}
//游戏循环函数
const startGameLoop = () => {
  gameInterval.value = setInterval(() => {
    //如果暂停 则不执行
    if (!isPlaying.value) return
    //每一次循环 当前方块下落并重新渲染一次当前方块
    moveDown()
    renderCurrentPiece()
  }, interval)
}
//生成当前方块的函数
const spawnNewPiece = () => {
  //如果没有下一个方块 则先生成一个 避免bug 其实我感觉不加也行
  if (!nextPiece.value) {
    generateNextPiece()
  }
  //设置方块的初始位置和形状 形状是从nextPiece中获取的 因为点击游戏开始的时候是先生成的下一个方块 然后再生成当前方块
  currentPiece.value = {
    shape: nextPiece.value.shape,
    //初始x为总宽度的一般减去方块宽度的一半 方块宽度等于形状每行的长度即shape[n].length为了避免I的情况所以直接用
    // shape[0].length
    x: Math.floor(col / 2) - Math.floor(nextPiece.value.shape[0].length / 2),
    y: 0,
  }
  //检测游戏是否结束 场景：刚生成新的方块就碰撞了
  if (
    checkCollision(
      currentPiece.value.shape,
      currentPiece.value.x,
      currentPiece.value.y
    )
  ) {
    //如果刚生成新的方块就碰撞了 则游戏结��
    gameOver.value = true
    isPlaying.value = false
    //清除游戏循环
    if (gameInterval.value) {
      clearInterval(gameInterval.value)
      //将循环标记重置为空
      gameInterval.value = null
    }
    //碰撞之后就处理完上面的逻辑 不往下走了（下面是生成新的方块并渲染当前方块的逻辑）
    return
  }
  //生成新的方块
  generateNextPiece()
  //渲染当前方块
  renderCurrentPiece()
}
//生成下一个方块的函数
const generateNextPiece = () => {
  //获取所有方块的形状
  const shapes = Object.keys(SHAPES)
  //随机选择一个形状
  const randomShape = shapes[Math.floor(Math.random() * shapes.length)]
  // 随机选择一个形状 shapes 是一个数组里面有所有的形状的key randomShape是随机选择的一个形状的key
  nextPiece.value = {
    shape: SHAPES[randomShape], //shape是二维数组
    type: randomShape, //type是字符串 OTSZIL之类的
  }
  renderNextPiece() // 渲染预览区域的下一个方块
}
// 渲染预览区域的下一个方块
const renderNextPiece = () => {
  // 渲染前清空预览区域的方块
  nextPieceMatrix.value = Array(4)
    .fill()
    .map(() => Array(4).fill(0))
  const shape = nextPiece.value.shape
  //计算在预览区域的居中偏移量
  // const offsetX = Math.floor(4 - shape[0].length) / 2
  //上面这么算不对 会出来小数
  const offsetX = Math.floor((4 - shape[0].length) / 2)
  const offsetY = Math.floor((4 - shape.length) / 2)
  // 将方块形状渲染到预览矩阵中 一维的是y 二维的是x
  for (let i = 0; i < shape.length; i++) {
    for (let j = 0; j < shape[0].length; j++) {
      if (shape[i][j]) {
        nextPieceMatrix.value[i + offsetY][j + offsetX] = 1
      }
    }
  }
}

// 处理键盘事件
const handleKeydown = e => {
  if (!isPlaying.value || gameOver.value) return // 游戏未进行或已结束时不响应
  // console.log(e.key)
  switch (e.key) {
    case 'ArrowLeft': // 左箭头：向左移动
      moveLeft()
      break
    case 'ArrowRight': // 右箭头：向右移动
      moveRight()
      break
    case 'ArrowDown': // 下箭头：向下移动
      moveDown()
      break
    case 'ArrowUp': // 上箭头：旋转
      rotate()
      break
    case ' ': // 空格键：快速下落
      hardDrop()
      break
  }
}
//快速下落实现
const hardDrop = () => {
  if (!currentPiece.value) return
  while (
    !checkCollision(
      currentPiece.value.shape,
      currentPiece.value.x,
      currentPiece.value.y + 1
    )
  ) {
    currentPiece.value.y++
  }
  renderCurrentPiece() // 渲染最终位置
  lockPiece() // 锁定方块
}
// 重置游戏状态
const resetGame = () => {
  score.value = 0 // 重置分数
  level.value = 1 // 重置等级
  gameOver.value = false // 重置游戏结束状态
  // 清空游戏矩阵
  gameMatrix.value = Array(row)
    .fill()
    .map(() => Array(col).fill(0))
  currentPiece.value = null // 清除当前方块
  nextPiece.value = null // 清除下一个方块
  // 清空预览矩阵
  nextPieceMatrix.value = Array(4)
    .fill()
    .map(() => Array(4).fill(0))
}
//检查碰撞 piece x y是方块的左上角位置
const checkCollision = (piece, x, y) => {
  for (let i = 0; i < piece.length; i++) {
    for (let j = 0; j < piece[0].length; j++) {
      if (piece[i][j]) {
        const newX = x + j
        const newY = y + i
        // 检查边界碰撞
        if (newX < 0 || newX >= col || newY >= row) {
          return true
        }
        // 检查与其他方块的碰撞
        // 只在方块在游戏区域内时检查方块碰撞
        // newY < 0 说明方块还在游戏区域上方，比如l形状,此时无需检查碰撞
        if (newY >= 0 && gameMatrix.value[newY][newX] === 2) {
          return true
        }
      }
    }
  }
  return false
}
// 将当前方块固定到游戏面板上
const lockPiece = () => {
  const { shape, x, y } = currentPiece.value
  // 将当前方块的位置标记为已占用（值为2）
  for (let i = 0; i < shape.length; i++) {
    for (let j = 0; j <= shape[0].length; j++) {
      if (shape[i][j]) {
        gameMatrix.value[y + i][x + j] = 2
      }
    }
  }
  checkLines() // 检查是否有可消除的行
  spawnNewPiece() // 生成新的方块
}
//向左移动
const moveLeft = () => {
  if (!currentPiece.value) return
  const newX = currentPiece.value.x - 1
  //检测移动后是否会碰撞 如果会碰撞就不移动
  if (!checkCollision(currentPiece.value.shape, newX, currentPiece.value.y)) {
    //如果不会碰撞就移动
    currentPiece.value.x = newX
    renderCurrentPiece()
  }
}
// 向右移动
const moveRight = () => {
  if (!currentPiece.value) return
  const newX = currentPiece.value.x + 1

  //检测移动后是否会碰撞 如果会碰撞就不移动
  if (!checkCollision(currentPiece.value.shape, newX, currentPiece.value.y)) {
    //如果不会碰撞就移动
    currentPiece.value.x = newX
    renderCurrentPiece()
  }
}
// 向下移动
const moveDown = () => {
  if (!currentPiece.value) return

  // 检测移动后是否会碰撞
  if (
    !checkCollision(
      currentPiece.value.shape,
      currentPiece.value.x,
      currentPiece.value.y + 1
    )
  ) {
    currentPiece.value.y++
    renderCurrentPiece()
  } else {
    //如果会碰撞就锁定方块
    lockPiece()
  }
}
// 旋转方块
const rotate = () => {
  if (!currentPiece.value) return

  // 计算旋转后的形状（这是逆时针旋转）
  // const rotated = currentPiece.value.shape[0].map((_, i) =>
  //   currentPiece.value.shape.map((row) => row[row.length - 1 - i])
  // );
  // 计算旋转后的形状（这是顺时针旋转）
  const rotated = currentPiece.value.shape[0].map((_, i) => {
    // 深拷贝 如果直接reverse 会改变原数组 因为是对数组内存地址的引用
    const reversed = [...currentPiece.value.shape].reverse()
    return reversed.map(row => row[i])
  })

  // 检查旋转后是否会发生碰撞;
  if (!checkCollision(rotated, currentPiece.value.x, currentPiece.value.y)) {
    // if (true) {
    currentPiece.value.shape = rotated
    renderCurrentPiece()
  }
}
//检查并清除完整的行
const checkLines = () => {
  //定义一个变量用于存储消除的行数
  let linesCleared = 0
  //从下往上for循环 一行一行判断是否需要消除
  for (let i = row - 1; i >= 0; i--) {
    //如果整行都被占用 即所有cell都是2
    if (gameMatrix.value[i].every(cell => cell === 2)) {
      //移除被占用的行
      gameMatrix.value.splice(i, 1)
      //在顶部添加一个空行
      gameMatrix.value.unshift(new Array(col).fill(0))
      //增加消除的行数
      linesCleared++
      //重新检查当前行，因为上面已经下移了一行
      i++
    }
  }
  //循环完了 开始更新分数和等级
  if (linesCleared > 0) {
    //更新分数
    score.value += linesCleared * 100 * level.value
    //每清除10行升一级
    level.value = Math.floor(score.value / 1000) + 1
  }
}
//渲染当前方块到游戏矩阵
const renderCurrentPiece = () => {
  if (!currentPiece.value) return
  //清除之前的活动方块 即把cell为1的 都变成0
  for (let i = 0; i < row; i++) {
    for (let j = 0; j < col; j++) {
      if (gameMatrix.value[i][j] === 1) {
        gameMatrix.value[i][j] = 0
      }
    }
  }
  //渲染当前方块到游戏矩阵
  const { shape, x, y } = currentPiece.value
  for (let i = 0; i < shape.length; i++) {
    for (let j = 0; j < shape[0].length; j++) {
      if (shape[i][j] && y + i > 0) {
        gameMatrix.value[y + i][x + j] = 1
      }
    }
  }
}
//组件挂载时添加事件监听
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})
//组件卸载时移除事件监听并清理定时器
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (gameInterval.value) {
    clearInterval(gameInterval.value)
  }
})
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
// 预览面���样式
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
