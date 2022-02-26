class Config{
	constructor({lightSize=null, shadowMapSize=null}={}){
		var cookieData = this.getCookieData()

		console.log(cookieData)

		if(this.lightSize == null){
			if(Object.keys(cookieData).includes('lightSize') && parseInt(cookieData.lightSize) != NaN){
				console.log('passed')
				this.lightSize = parseInt(cookieData.lightSize)
			} else {
				this.lightSize = 100
			}
		} else {
			this.lightSize = lightSize
		}

		if(this.shadowMapSize == null){
			if(Object.keys(cookieData).includes('shadowMapSize') && parseInt(cookieData.shadowMapSize) != NaN){
				this.shadowMapSize = parseInt(cookieData.shadowMapSize)
			} else {
				this.shadowMapSize = 4096
			}
		} else {
			this.shadowMapSize = shadowMapSize
		}

		this.updateCookie()

		this.SMChangeHandlerCB = null
		this.LSChangeHandlerCB = null

		document.getElementById('lightSizeInput').value = this.lightSize
		document.getElementById('shadowMapInput').value = this.shadowMapSize
	}
	getCookieData(){
		var cookie = document.cookie
		var data = {}

		var firstKey = cookie.substring(0,cookie.indexOf('=')).trim()
		data[firstKey] = cookie.substring(cookie.indexOf('=')+1, cookie.indexOf(';'))

		cookie = cookie.substring(cookie.indexOf(';')+1, cookie.length)

		var secondKey = cookie.substring(0, cookie.indexOf('=')).trim()
		data[secondKey] = cookie.substring(cookie.indexOf('=')+1, cookie.length)

		return data
	}
	updateCookie(){
		document.cookie = 'lightSize='+this.lightSize
		document.cookie = 'shadowMapSize='+this.shadowMapSize
	}
	setListeners(){
		this.setConfigButtonClickListener()
		this.setApplyClickListener()
	}
	setConfigButtonClickListener(){
		document.getElementById('config').onclick = this.configButtonClickHandler
	}
	configButtonClickHandler(){
		var w = document.getElementById('configWindow')
		if(w.style.visibility == 'visible'){
			w.style.visibility = 'hidden'
		} else {
			w.style.visibility = 'visible'
		}
	}

	setSMChangeHandlerCB(cb){
		this.SMChangeHandlerCB = cb
	}

	setLSChangeHandlerCB(cb){
		this.LSChangeHandlerCB = cb
	}

	setApplyClickListener(){
		document.getElementById('apply').onclick = this.applyClickHandler.bind(this)
	}

	applyClickHandler(){
		var lsVal = document.getElementById('lightSizeInput').value
		var smVal = document.getElementById('shadowMapInput').value


		if(parseInt(lsVal) != NaN){
			if(this.LSChangeHandlerCB != null){
				this.LSChangeHandlerCB(parseInt(lsVal))
				this.lightSize = lsVal
			}
		}

		if(parseInt(smVal) != NaN){
			if(this.SMChangeHandlerCB != null){
				this.SMChangeHandlerCB(parseInt(smVal))
				this.shadowMapSize = smVal
			}
		}
		this.updateCookie()
	}
}

