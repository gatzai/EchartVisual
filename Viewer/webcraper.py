#coding=utf8
import requests
import bs4
from bs4 import BeautifulSoup
import csv
import json
import sys
reload(sys)                         
sys.setdefaultencoding('utf-8')     

#熵是r = requests.get("")
print("Start crawler")

def getHTMLText(url):
	try:
		r = requests.get(url, timeout=10)
		r.raise_for_status()
		r.encoding = r.apparent_encoding
		return r.text
	except:
		return ""

def findTable(ulist, html):
	soup = BeautifulSoup(html, "html.parser")
	tbs = soup.findAll('table')
	tlen = len(tbs)
	print("Table Count:%d"%tlen)
	if tlen == 0:
		print("no table")
		return
	elif tlen > 2:
		print("too many tables")
		return

	table = tbs[0]
	thead = table.find('thead')
	if thead:
		print("i have thead")
		for tr in thead.children:
			if isinstance(tr, bs4.element.Tag):
				ths = tr('th')
				row = []
				for text in ths:
					row.append(text.string)
				ulist.append(row)
				#ulist.append
		tbody = table.find('tbody')
		if tbody:
			for tr in tbody.children:
				if isinstance(tr, bs4.element.Tag):
					tds = tr('td')
					row = []
					for text in tds:
						row.append(text.string)
					ulist.append(row)


#	for tr in table.children:
#		if isinstance(tr, bs4.element.Tag):
#			tds = tr('td')
#			ulist.append([tds[0].string, tds[1].string, tds[2].string, tds[3].string, tds[4].string, tds[5].string, tds[6].string])



ulist = []
url = "http://www.stat-nba.com/query.php?QueryType=game&GameType=playoff&CW=player&Team_id=BOS&TOpponent_id=ATL&PageNum=40&Season0=1985&Season1=1986&crtcol=pts&order=1"
html = getHTMLText(url)


findTable(ulist,html)
ulist = map(list,zip(*ulist))
#还需要具体处理数据
resultList = []
#第一行球员
resultList.append(ulist[1][1:])
#获取列
col = [i[0] for i in ulist]
resultList.append(col[2:])
#具体数据
for row in ulist[2:]:
	resultList.append(row[1:])

print(resultList)

with open("te.json","w") as file_obj:
	file_obj.write("dataInit(")
	json.dump(resultList, file_obj)
	file_obj.write(")")