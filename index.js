(function () {
	// -------------------抢票流程入口-------------------
	var ctx = '/otn/'
	var seatType = {
		'商务座': '9',
		'一等座': 'M',
		'二等座': 'O',
		'高级软卧': '',
		'软卧': '4',
		'动卧': '',
		'硬卧': '3',
		'软座': '',
		'硬座': '1',
	}
	var querryObj = {
		train_date: $('#train_date').val(), // 出发日期
		fromStation: $('#fromStation').val(), // 出发站编码
		toStation: $('#toStation').val(), // 到达站编码
		purpose_codes: 'ADULT', // 票类型 （成人）
		back_train_date: '',
		tour_flag: 'dc', // 行程类型（单程）
		secretStr: '',
		from_station_text: $('#fromStationText').val(), // 出发站名称
		to_station_text: $('#toStationText').val(), // 到达站名称
		_json_att: '',
		stationTrainCode: 'K1020', // 列车车次代码（这里需要手动输入）
		randCode: '',
		leftTicketStr: '',
		whatsSelect: '1', // 选择席位类别（这里需要手动输入）
		choose_seats: '',
		seatDetailType: '000',
		roomType: '00',
		dwAll: '', // 车票信息数组下标11
		REPEAT_SUBMIT_TOKEN: '',
	}

	// 将对象转换成键值对字符串形式
	var formatForFormData = (data) => {
		var str = ''
		Object.keys(data).forEach((item, index) => {
			var value = data[item]
			if (index > 0) {
				str += '&'
			}
			if (value === undefined || value === null) {
				value = ''
			}
			if (Array.isArray(value)) {
				value = value.join(',')
			}
			str += `${item}=${value}`
		})
		return str
	}

	// 发送请求公共函数
	var getDataByAjax = (type, url, data, callback) => {
		$.ajax({
			type,
			url,
			data,
			success: (res) => {
				if (typeof callback === 'function') {
					callback(res)
				}
			},
			error: (e) => {
				console.log('出错了：', e)
			},
		})
	}

	// ---------------抢票流程
	// 第一步：查询车次信息列表
	var querryLeftTicket = () => {
		var {
			train_date,
			fromStation,
			toStation,
			purpose_codes,
		} = querryObj
		var url = `${ctx}leftTicket/queryZ?leftTicketDTO.train_date=${train_date}&leftTicketDTO.from_station=${fromStation}&leftTicketDTO.to_station=${toStation}&purpose_codes=${purpose_codes}`

		fetch(url, {
			credentials: 'include',
			method: 'GET',
		}).then(res => res.json()).then(resq => {
			console.log('第一步：查询车次信息列表：', resq)
			if (resq.data && resq.data.result) {
				const arr = resq.data.result
				
				arr.forEach(item => {
					const itemArr = item.split('|')
					if (itemArr[3] === querryObj.stationTrainCode) {
						querryObj.secretStr = itemArr[0]
						querryObj.train_no = itemArr[2]
						querryObj.fromStationTelecode = itemArr[6]
						querryObj.toStationTelecode = itemArr[7]
						// querryObj.dwAll = 'N'
						querryObj.dwAll = itemArr[11]
						querryObj.leftTicket = itemArr[12]
						querryObj.leftTicketStr = itemArr[12]
						querryObj.train_location = itemArr[15]
					}
				})
			}
			checkUser()
		}).catch(e => {})
	}

	// 第二步：check用户
	var checkUser = () => {
		var url = `${ctx}login/checkUser`
		getDataByAjax('POST', url, {}, (res) => {
			if (res.status) {
				console.log('第二步：check用户：', res)
				if (res.data.flag) {
					submitOrderRequest()
				}
			} else {
				querryLeftTicket()
				console.log('第二步：check用户失败')
			}
		})
	}

	// 第三步：选择某一车次进行抢票请求
	var submitOrderRequest = () => {
		var {
			secretStr,
			train_date,
			back_train_date,
			tour_flag,
			purpose_codes,
			from_station_text,
			to_station_text,
			_json_att,
		} = querryObj
		var url = `${ctx}leftTicket/submitOrderRequest`
		var data = {
			secretStr,
			train_date,
			back_train_date,
			tour_flag,
			purpose_codes,
			querry_from_station_name: from_station_text,
			querry_to_station_name: to_station_text,
			_json_att,
		}
		var fatData = formatForFormData(data)
		getDataByAjax('POST', url, fatData, (res) => {
			if (res.status) {
				console.log('第三步：选择某一车次进行抢票请求：', res)
				if (res.data === 'Y') {
					console.log('您选择的列车距离开车时间很近了，请确保有足够时间抵达车站！')
				}
				getInitDcHtml()
			} else {
				// querryLeftTicket()
				console.log('第三步：选择某一车次进行抢票请求失败！')
			}
		})
	}

	// 第四步：跳转到选票页面
	var getInitDcHtml = () => {
		var lastIframe = document.getElementById('iframeId')
		if (lastIframe) {
			document.body.removeChild(lastIframe)
		}
		var iframeEle = document.createElement('iframe')
		iframeEle.style.display = 'none'
		iframeEle.id = 'iframeId'
		iframeEle.src = `${ctx}confirmPassenger/initDc`
		iframeEle.onload = () => {
			querryObj.REPEAT_SUBMIT_TOKEN = iframeEle.contentWindow.globalRepeatSubmitToken
			querryObj.key_check_isChange = iframeEle.contentWindow.ticketInfoForPassengerForm && iframeEle.contentWindow.ticketInfoForPassengerForm.key_check_isChange
			querryObj._json_att = ''
			getPassengerDTOs()
		}
		document.body.appendChild(iframeEle)
	}

	// 第五步：获取用户联系人信息
	var getPassengerDTOs = () => {
		var url = `${ctx}confirmPassenger/getPassengerDTOs`
		var data = {
			_json_att: querryObj._json_att,
			REPEAT_SUBMIT_TOKEN: querryObj.REPEAT_SUBMIT_TOKEN,
		}
		getDataByAjax('POST', url, formatForFormData(data), (res) => {
			if (res.status) {
				console.log('第五步：获取用户联系人信息：', res)
				const normal_passengers = res.data.normal_passengers[0]
				querryObj.passengerTicketStr = `1,0,${normal_passengers.passenger_type},${normal_passengers.passenger_name},${normal_passengers.passenger_id_type_code},${normal_passengers.passenger_id_no},${normal_passengers.mobile_no},N`
				querryObj.oldPassengerStr = `${normal_passengers.passenger_name},${normal_passengers.passenger_id_type_code},${normal_passengers.passenger_id_no},${normal_passengers.passenger_type}_`
				setTimeout(checkOrderInfo, 200)
			} else {
				// querryLeftTicket()
				console.log('第五步：获取用户联系人信息失败。')
			}
		})
	}

	// 第六步：检查排队信息
	var checkOrderInfo = () => {
		var url = `${ctx}confirmPassenger/checkOrderInfo`
		var data = {
			cancel_flag: '2',
			bed_level_order_num: '000000000000000000000000000000',
			passengerTicketStr: querryObj.passengerTicketStr, // 用户基本信息
			oldPassengerStr: querryObj.oldPassengerStr, // 购票人信息
			tour_flag: querryObj.tour_flag,
			randCode: querryObj.randCode,
			whatsSelect: querryObj.whatsSelect, // 选择席位类别
			_json_att: querryObj._json_att,
			REPEAT_SUBMIT_TOKEN: querryObj.REPEAT_SUBMIT_TOKEN,
		}
		getDataByAjax('POST', url, formatForFormData(data), (res) => {
			if (res.status) {
				console.log('第六步：检查排队信息：', res)
				getQueueCount()
			} else {
				// querryLeftTicket()
				console.log('第六步：检查排队信息失败。')
			}
		})
	}

	// 第七步：获取余票数量
	var getQueueCount = () => {
		var url = `${ctx}confirmPassenger/getQueueCount`
		var data = {
			train_date: encodeURIComponent(new Date(querryObj.train_date)),
			train_no: querryObj.train_no,
			stationTrainCode: querryObj.stationTrainCode,
			seatType: querryObj.whatsSelect,
			fromStationTelecode: querryObj.fromStationTelecode,
			toStationTelecode: querryObj.toStationTelecode,
			leftTicket: encodeURIComponent(querryObj.leftTicket),
			purpose_codes: querryObj.purpose_codes,
			train_location: querryObj.train_location,
			_json_att: querryObj._json_att,
			REPEAT_SUBMIT_TOKEN: querryObj.REPEAT_SUBMIT_TOKEN,
		}
		getDataByAjax('POST', url, formatForFormData(data), (res) => {
			if (res.status) {
				console.log('第七步：获取余票数量：', res)
				if (res.data.ticket === '0') {
					// querryLeftTicket()
				} else {
					confirmSingleForQueue()
				}
			} else {
				// querryLeftTicket()
			}
		})
	}

	// 第八步：排队购买单程票
	var confirmSingleForQueue = () => {
		var url = `${ctx}confirmPassenger/confirmSingleForQueue`
		var data = {
			passengerTicketStr: querryObj.passengerTicketStr,
			oldPassengerStr: querryObj.oldPassengerStr,
			randCode: querryObj.randCode,
			key_check_isChange: querryObj.key_check_isChange,
			leftTicketStr: encodeURIComponent(querryObj.leftTicketStr),
			purpose_codes: querryObj.purpose_codes,
			train_location: querryObj.train_location,
			choose_seats: querryObj.choose_seats,
			seatDetailType: querryObj.seatDetailType,
			whatsSelect: querryObj.whatsSelect,
			roomType: querryObj.roomType,
			dwAll: querryObj.dwAll,
			_json_att: querryObj._json_att,
			REPEAT_SUBMIT_TOKEN: querryObj.REPEAT_SUBMIT_TOKEN,
		}
		getDataByAjax('POST', url, formatForFormData(data), (res) => {
			if (res.status) {
				console.log('第八步：排队购买单程票：', res)
				if (!res.data.submitStatus) {
					console.log('第八步：排队购买单程票失败')
				} else {
					// var aa = new OrderQueueWaitTime('dc', v, Q)
					// aa.start()
					console.log('第八步：正在出票')
				}
			} else {
				// querryLeftTicket()
				console.log('第八步：排队购买单程票失败')
			}
		})
	}

	function v(V, X, W) {
		if (X <= 5) {
			console.log("订单已经提交，系统正在处理中，请稍等。")
		} else {
			if (X > 30 * 60) {
				console.log("订单已经提交，预计等待时间超过30分钟，请耐心等待。")
			} else {
				console.log("订单已经提交，最新预估等待时间" + W + "，请耐心等待。")
			}
		}
	}
	function Q(V, Y, W) {
		if (Y == -1 || Y == -100) {
			var X = "";
			X = ctx + "confirmPassenger/resultOrderForDcQueue"
			$.ajax({
				url: X,
				data: {
					orderSequence_no: W.orderId
				},
				type: "POST",
				dataType: "json",
				success: function(Z) {
					if (Z.status) {
						if (Z.data.submitStatus) {
							otsRedirect("post", ctx + "/payOrder/init?random=" + new Date().getTime(), {})
						} else {
							console.log("下单成功")
						}
					} else {
						console.log("下单成功")
					}
				},
				error: function(Z, ab, aa) {
					console.log("下单成功")
				}
			})
		}
	}

	function OrderQueueWaitTime(a, c, b) {
		this.tourFlag = a;
		this.waitMethod = c;
		this.finishMethod = b;
		this.dispTime = 1;
		this.nextRequestTime = 1;
		this.isFinished = false;
		this.waitObj
	}
	OrderQueueWaitTime.prototype.start = function(a) {
		if (!a) {
				a = 1000
		}
		var b = this;
		b.timerJob();
		window.setInterval(function() {
				b.timerJob()
		}, parseInt(a))
	}
	OrderQueueWaitTime.prototype.timerJob = function() {
		if (this.isFinished) {
				return
		}
		if (this.dispTime <= 0) {
				this.isFinished = true;
				this.finishMethod(this.tourFlag, this.dispTime, this.waitObj);
				return
		}
		if (this.dispTime == this.nextRequestTime) {
				this.getWaitTime()
		}
		var a = this.dispTime;
		var c = "";
		var b = parseInt(a / 60);
		if (b >= 1) {
				c = b + "分";
				a = a % 60
		} else {
				c = "1分"
		}
		this.waitMethod(this.tourFlag, this.dispTime > 1 ? --this.dispTime : 1, c)
	}
	OrderQueueWaitTime.prototype.getWaitTime = function() {
		var a = this;
		$.ajax({
				url: ctx + "confirmPassenger/queryOrderWaitTime?random=" + new Date().getTime(),
				type: "GET",
				data: {
						tourFlag: a.tourFlag
				},
				dataType: "json",
				success: function(c) {
						var e = c.data;
						if (!e.queryOrderWaitTimeStatus) {
								window.location.href = ctx + "view/index.html?random=" + new Date().getTime()
						} else {
								if (e != null) {
										a.waitObj = e;
										if (e.waitTime != -100) {
												a.dispTime = e.waitTime;
												var d = parseInt(e.waitTime / 1.5);
												d = d > 60 ? 60 : d;
												var b = e.waitTime - d;
												a.nextRequestTime = b <= 0 ? 1 : b
										}
								}
						}
				},
				error: function(b, d, c) {
						return false
				}
		})
	}


	querryLeftTicket()
})()
