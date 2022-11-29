//导出json
const exportFileJSON = (data = {}, filename = 'dataJSON.json') => {
  if (typeof data === 'object') {
    data = JSON.stringify(data, null, 4);
  }
    // 导出数据
    const blob = new Blob([data], { type: 'text/json' }),
    e = new MouseEvent('click'),
    a = document.createElement('a');

    a.download = filename;
    a.href = window.URL.createObjectURL(blob);
    a.dataset.downloadurl = ['text/json', a.download, a.href].join(':');
    a.dispatchEvent(e);
  }