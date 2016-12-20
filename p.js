let superagent = require('superagent')
let request = require('request')
let cheerio = require('cheerio')
let Path = require('path')
let now = +(new Date())
let fs = require('fs')

const prefix = ''

let showTime = () => {
  let n = +(new Date())
  let time = (n - now) / 1000
}

let common = (url, cb, isMp4) => {
  return new Promise((resolve, reject) => {
    superagent.get(url)
      .end(function (err, res) {
        if (err) {
          reject(err)
        }
        let $
        try {
          $ = cheerio.load(res.text)
        } catch (e) {
          $ = false
        }
        if (!$) {
          resolve([])
          return
        }

        if (isMp4) {
          let totalText = res.text
          let bIndex = totalText.indexOf('var video=')
          let eIndex = totalText.lastIndexOf(".mp4'")
          let str = totalText.substring(bIndex + 12, eIndex + 4)
          str = 'https:' + str
          return resolve([{
            text: Path.basename(decodeURIComponent(str)),
            href: str
          }])
        }

        let items = []
        $('a').each(function (idx, element) {
          var $element = $(element);
          let text = $element.text()
          var preText = $element.prev().text()
          if (preText.indexOf('目录') !== -1 && text.indexOf('上一级') === -1) {
            items.push({
              text: $element.text(),
              href: prefix + $element.attr('href')
            })
          }
          if (cb) {
            let _flag = text.indexOf('jpg') !== -1
              || text.indexOf('png') !== -1
            if (_flag) {
              items.push({
                text: $element.text(),
                href: 'https:' + $element.attr('href')
              })
            }
          }

          let flag = preText.indexOf('相片') !== -1
            || preText.indexOf('视频') !== -1
            || preText.indexOf('视频') !== -1
            || preText.indexOf('资料') !== -1
            || preText.indexOf('其他') !== -1

          if (flag && !cb) {
            items.push({
              text: $element.text(),
              href: prefix + $element.attr('href')
            })
          }
        })
        // showTime()
        resolve(items)
      })
  })
}

let main = () => {
  let url = ''
  return common(url)
}

let sub = (url) => {
  // showTime()
  return common(url)
}

let subAll = (res) => {
  let list = []
  let url = ''
  return new Promise((resolve, reject) => {
    res.forEach(item => {
      url = item.href
      list.push(sub(url))
    })
    Promise.all(list).then(res => {
      let list = []
      res.forEach(item => {
        list = list.concat(item)
      })
      resolve(list)
    }).catch(e => {
      reject(e)
    })
  })
}

function ready () {
  main().then(res => {
    return subAll(res)
  }).then(res => {
    return res
  }).then(res => {
    showTime()
    fs.writeFile('./message.txt', JSON.stringify(res), (err) => {
      if (err) {
        console.log(err)
        return
      }
      console.log('It\'s saved!')
    });
  })
}

// 收集全部信息到 message.txt
// ready()

function handleTxt (p, obj, i) {
  const path = p
  common(obj.href).then(res => {
    let tPath = path + '/message.txt'
    if (!fs.existsSync(tPath)) {
      fs.writeFile(tPath, JSON.stringify(res), (err) => {
        if (err) {
          console.log(err)
          return
        }
        console.log('It\'s saved!')
      })
    }
    res.forEach((item, index) => {
      let href = item.href
      let _flag = href.indexOf('mp4') !== -1
      let canLoaded = href.indexOf('') !== -1
      if (canLoaded) {
        let decodeHref = decodeURIComponent(href)
        let _filePath = path + '/' + Path.basename(decodeURIComponent(href))
        href = href.replace('', '')
        let type = Path.extname(decodeHref)
        downloadImg(href, _filePath, () => { console.log(type + ' ' + _filePath + ' success') })
        return
      }
      common(item.href, true, _flag).then(r => {
        r.forEach(i => {
          let decodeHref = decodeURIComponent(i.href)
          let filePath = path + '/' + Path.basename(decodeHref)
          let type = Path.extname(decodeHref)
          downloadImg(i.href, filePath, () => { console.log(type + ' ' + filePath + ' success') })
        })
      }).catch(e => {})
    })
  }).catch(e => {})
}

function downloadImg (uri, path, callback) {
  request(uri).pipe(fs.createWriteStream(path)).on('close', callback)
}

let data = fs.readFileSync('./message.txt')
data = JSON.parse(data)

let len = data.length
let obj
let text
let ext = ['jpg', 'png', 'mp4']
let reg = /jpg|png|mp4/g
let path
let dirs = []

let count = 0

function handleSteps (bIndex, sLen) {
  let max = len < (bIndex + sLen) ? len : (bIndex + sLen)
  if (max >= len) {
    clearSetInterval(tid)
  }
  for (let i = bIndex; i < max; i++) {
    obj = data[i]
    text = obj.text
    path = './files/' + obj.text
    if (reg.test(text)) {
      continue
    }
    if (path.indexOf('mp4') !== -1
      || path.indexOf('png') !== -1
      || path.indexOf('jpg') !== -1) {
        continue
      }
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path)
    }

    dirs.push(obj)
    handleTxt(path, obj)
    console.log('----------bIndex------------')
    console.log(bIndex)
    console.log('----------bIndex------------')
  }
}

let totalBegin = 23
let tLen = 1
let tid = null
setTimeout(() => {
  handleSteps(totalBegin++, tLen)
}, 0)
tid = setInterval(() => {
  handleSteps(totalBegin++, tLen)
}, 30000)
