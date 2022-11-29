/**
* 计算一个点是否在多边形里
* @param {Object} pt 标注点
* @param {Object} poly 多边形数组
* ref: https://blog.csdn.net/a460550542/article/details/111592521
*/
function isInsidePolygon(pt, poly){
	for (var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i) 
		((poly[i][1] <= pt[1] && pt[1] < poly[j][1]) || (poly[j][1] <= pt[1] && pt[1] < poly[i][1])) &&
	(pt[0] < (poly[j][0] - poly[i][0]) * (pt[1] - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0]) &&
	(c = !c);
	return c;
}

var GeoAll = {};

//多边形内的行政区坐标域
var changjiang_cities_polys = []
//多边形内的行政区坐名字
var changjiang_cities_polys_names = []

//构建非高级行政规划区字典, 字典可以从低级开始索引
//GeoAll
function init_addr_map(districts, prename = "", level=1)
{
	if(districts == undefined)
		return
	if(districts.length > 0)
	{
		for(i in districts)
		{
			var pos = districts[i].center.split(',');
			var name = districts[i].name;
			var temp = {"geo":pos, "upper":prename};
            //判断行政区是否在长江区域内
            //if(isInsidePolygon(pos, changjinag_polys))
            //	changjiang_cities_polys.push(pos)
            //GeoAll[districts[i].name] = pos;  //这样不行，某些地区会有重复名字

            //TODO, 如何构建一个鲁棒的地名到坐标的索引
            //方案一：层级索引，但是无法建立快速的非顶级行政区索引, 对于层级中断会有非常大的开销
            //方案二：单级索引，但会有重复问题
            //方案三：单级数组索引，但比较麻烦，这个方案比较号
            	/*
            		对于‘乡镇’和‘街道’ 建立索引，对于重复值构建数组，然后往上一级对比省、市匹配。就是除了最顶两级的行政区。
					如果都找不到，
						1. 位置数据都不存在，直接抛弃
						2. 干扰文字导致，输出并修复
            	*/
            if(level > 2)
            {
            	if(name in GeoAll)
            	{
            		GeoAll[name].push(temp)
            	}
            	else
            	{
            		var poss = []
            		poss.push(temp);
            		GeoAll[name] = poss; 
            	}
            }
            init_addr_map(districts[i].districts, prename+name, level+1);
        }
    }
}

init_addr_map(geoinfo)

//模糊搜索地名，并返回坐标，从最小的地区开始
//省，市，县
function mohu_geo(name) {
	//!!进行一些筛选和修复
	//策略：
	//case 1. 先找原名是否存在
	//case 2. 加一些后缀，看看是否能找到
	//case 3. 减一些后缀，看看是否能找到
	//case 4. 先减后加，看看是否能找到
	var add_surfix = ["区","县","镇","乡","街道"];
	//其实减是不用管什么字符的，只需要取一个字串即可

	//case 1
    if(name in GeoAll)
    	return GeoAll[name];
    else
    {
    	//case 2
    	var name_len = name.length;
    	for(var i in add_surfix)
    	{
    		var new_name = name + add_surfix[i];
    		if(new_name in GeoAll)
    			return GeoAll[new_name];
    	}

    	//case 3
    	for(var i = name_len-1; i>=2; --i)
    	{
    		var new_name = name.substr(0, i);
    		if(new_name in GeoAll)
    			return GeoAll[new_name];
    	}

    	//case 4
    	for(var i = name_len-1; i>=2; --i)
    	{
    		var dec_name = name.substr(0, i);
    		for(var j in add_surfix)
    		{
    			var new_add_name = dec_name + add_surfix[j];
    			if(new_add_name in GeoAll)
    				return GeoAll[new_add_name];
    		}
    	}
    }

    console.log("Not in ",name)
    return null
}

//根据地名结构{'sheng','shi','xianqu','xiangzhen','jiedao'}获取坐标
var std_names = ['jiedao', 'xiangzhen', 'xianqu', 'shi', 'sheng'];
function get_area_geo(addr)
{
	for(var i in std_names)
	{
		var name = std_names[i];
		if(name == 'shi')
			break; //市之后的都不查询
		if(addr[name] != '')
		{
			var pos = mohu_geo(addr[name]);
			if(pos != null)
			{
				if(pos.length > 1)
				{
					for(var j in pos)
					{
						var isup = pos[j]['upper'].indexOf(addr['shi']);
						if(isup != -1)
							return pos[j]['geo']
					}
					for(var j in pos)
					{
						var isup = pos[j]['upper'].indexOf(addr['sheng']);
						if(isup != -1)
							return pos[j]['geo']
					}
				}
				else 
					return pos[0]['geo']
			}
		}
	}
	return null;
}

//数据太多了，只拿一定范围的
var limit = [0,5000];
//把每个企业的迁移路线建立数组
//[{coords:[[经度，纬度],[经度，纬度],...]},...]
function convert_ep_lines(enterprises)
{
	var lines = [];
	var count = 0;
	for(var ep_id in enterprises)
	{
		count = count +1;
		if(count > limit[1] || count < limit[0])
			continue;
		var line = {coords:[]};
		for(var y in enterprises[ep_id])
		{

            var area_info = enterprises[ep_id][y];
            //geo
            var p = get_area_geo(area_info);
            if(p != null)
            {
            	line.coords.push([p[0],p[1]]);
            }
		}
		//至少发生过一次迁移才画线
		if(line.coords.length > 1)
			lines.push(line);
	}

	return lines;
}

//[[经度，维度，年份，企业id],...]
function convert_year_scatters(enterprises)
{
	var data = [];
	var count = 0;
	for(var ep_id in enterprises)
	{
		++count;
		if(count > limit[1] || count < limit[0])
			continue;
		for(var y in enterprises[ep_id])
		{
            //console.log(y) //year
            var area_info = enterprises[ep_id][y];
            //geo
            var p = get_area_geo(area_info);
            if(p != null)
            {
            	//直接push进去会变成浅拷贝
            	//p.push(y);
            	data.push([p[0], p[1], y, ep_id]);
            }
        }
    }
    return data;
}

