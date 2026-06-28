# EnglishWord

EnglishWord 是一个结合 Chrome 插件、Flask 后端和网页端背单词系统的英语学习工具。

## 项目简介

这个项目可以帮助用户在浏览网页时进行划词翻译，并将翻译结果同步到网页端的单词管理页面，方便日常背单词和复习。
项目地址 ：http://136.117.65.65/englishword/
## 核心功能

### 1. 划词翻译
在网页中选中英文单词或短语后，插件会自动获取：

- 选中单词的意思
- 所在句子的意思

这样用户可以在阅读上下文时理解单词，而不是只看孤立的词义。

### 2. 网页端背单词
网页端提供一个简单的单词管理界面，用户可以：

- 查看已同步的单词和句子
- 查看单词与句子的中文解释
- 管理自己的学习数据

### 3. 数据同步
插件分析得到的结果会同步到网页端系统中，用户可以在网页中继续查看和复习。

## 项目结构

- `chrome_extension/`：Chrome 插件源码
- `wordlist/frontend/`：Vue 3 前端页面
- `wordlist/backend/`：Flask 后端和数据库逻辑

## 使用方法

### 1. 安装 Chrome 插件

1. 打开 `chrome_extension` 目录。
2. 将其作为“已解压的扩展程序”加载到 Google Chrome 中。
3. 打开插件的选项页，填写一个唯一的用户名。

### 2. 使用网页端

1. 打开[网页端](http://136.117.65.65/englishword/) 页面：http://136.117.65.65/englishword/
2. 在页面中输入一个唯一用户名。
3. 确保插件中的用户名和网页中的用户名保持一致。
4. 在网页上选中文字后，使用插件进行划词分析。
5. 翻译结果会同步到网页端。

## 重要说明

要让数据正确同步，必须保证以下两个地方使用相同的用户名：

- 网页端背单词页面
- Chrome 插件的 options 设置

如果用户名不同，数据将不会被正确关联到同一个用户。

## 本地运行

### 后端

```bash
cd wordlist/backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

### 前端

```bash
cd wordlist/frontend
npm install
npm run dev
```

## 许可证

本项目仅供学习和个人使用。
