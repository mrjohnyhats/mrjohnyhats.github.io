class Sprite{
	constructor(image, x, y, sp){
		this.image = image;
		this.x = x;
		this.y = y;
		this.dx = 0;
		this.dy = 0;
		this.width = this.image.width*sp
		this.height = this.image.height*sp
		this.dragging = false;
		this.dragOffset = [0,0]
	}
	move(){
		this.x += this.dx;
		this.y += this.dy
	}
	draw(){
		image(this.image, this.x, this.y, this.width, this.height)
	}
	inImage(x, y){
		return x > this.x && x < this.x+this.width && y > this.y && y < this.y+this.height
	}
	startDrag(mx, my){
		this.dragOffset = [this.x-mx, this.y-my]
		this.dragging = true
	}
	endDrag(){
		this.dragging = false
	}
	drag(x, y){
		this.x = x + this.dragOffset[0]
		this.y = y + this.dragOffset[1]
	}
}

var wheelImage, teslaImage, backgroundImage
var wheel1, wheel2, tesla
var teslaFinished = false;
var WIDTH = 1500
var HEIGHT = 800
var teslaTime = 0;
var workTime = 0;
var WAGE = 10;
var teslaNumber = parseInt(Math.random()*10000)
var teslaTimes = []
var bossHappiness = 1
var unhappyStreak = 0
var employed = true;

function preload(){
	teslaImage = loadImage('./tesla.png')
	wheelImage = loadImage('./wheel.png')
	backgroundImage = loadImage('./background.jpg')
}

function setup(){
	createCanvas(WIDTH, HEIGHT)
	
	tesla = new Sprite(teslaImage, WIDTH, HEIGHT/2, 1)
	wheel1 = new Sprite(wheelImage, WIDTH-wheelImage.width, HEIGHT-wheelImage.height, 1)
	wheel2 = new Sprite(wheelImage, 0, HEIGHT-wheelImage.height, 1)
}

function draw(){
	background(255,255,255)
	image(backgroundImage, 0,0,WIDTH, HEIGHT)
	if(employed){
		tesla.move()
		wheel1.move()
		wheel2.move()

		tesla.draw()
		wheel1.draw()
		wheel2.draw()

		fill(0)
		strokeWeight(1)
		textSize(50)
		text('money earned0 ($'+WAGE+'/hr): $'+parseInt(workTime/3600000*WAGE*1000)/10000.0,  100, 100)
		text('time spent working on tesla #'+teslaNumber+': '+parseInt(teslaTime)/1000.0+' seconds', 100, 200)

		text('boss:', 30, 300)
		stroke(0)
		noFill()
		strokeWeight(10)
		beginShape();
		curveVertex(200,350)
		curveVertex(200,350)
		curveVertex(220,350+50*(bossHappiness-0.4))
		curveVertex(240, 350+75*(bossHappiness-0.4))
		curveVertex(300,350+100*(bossHappiness-0.4))
		curveVertex(360,350+75*(bossHappiness-0.4))
		curveVertex(380,350+50*(bossHappiness-0.4))
		curveVertex(400,350)
		curveVertex(400,350)
		endShape()
		fill(0)
		line(250,250, 250,300)
		line(350,250, 350,300)

		if(tesla.x > (WIDTH-tesla.width)/2){
			tesla.dx = -5;
		} else if(!teslaFinished) {
			tesla.dx = 0
			teslaTime += deltaTime
		}

		if(teslaFinished && tesla.x < tesla.width*-1){
			resetTesla()
			teslaTimes.push(teslaTime)
			teslaTime = 0;
			teslaNumber = parseInt(Math.random()*10000)

			var prevHappiness = bossHappiness
			bossHappiness = getBossHappiness()
			console.log(bossHappiness)

			if(prevHappiness < 0.4 && bossHappiness < 0.4){
				unhappyStreak += 1
			} else {
				unhappyStreak = 0
			}

			if(unhappyStreak > 2){
				employed = false
			}
		}

		workTime += deltaTime
	} else {
		fill(0)
		textSize(100)
		textAlign(CENTER)
		strokeWeight(3)
		text('you\'re fired :(', WIDTH/2, HEIGHT/2)
		textSize(30)
		fill(255)
		text('stop slacking', WIDTH/2, HEIGHT/2+200)
	}
}

function mouseDragged(){
	var wheels = [wheel1, wheel2];
	wheels.forEach((w) => {
		if(w.inImage(mouseX, mouseY)){
			if(!w.dragging){
				w.startDrag(mouseX, mouseY)
			}
			w.drag(mouseX, mouseY)
		}
	})
	// console.log(wheel1.inImage(mouseX, mouseY), wheel2.inImage(mouseX, mouseY), wheel1.x, wheel1.y, wheel2.x, wheel2.y)


}

function wheelInTesla(x, y){
	return (x > 940 && y > 540 && x < 950 && y < 555) || (x > 370 && y > 544 && x < 380 && y < 555)
}

function resetTesla(){
	teslaFinished = false;
	tesla.x = WIDTH

	wheel1.dx = 0
	wheel2.dx = 0
	wheel1.x = WIDTH-wheelImage.width
	wheel1.y = HEIGHT-wheelImage.height
	wheel2.x = 0
	wheel2.y = HEIGHT-wheelImage.height

}

function mouseReleased(){
	var wheels = [wheel1, wheel2];
	wheelsInTesla = true;
	wheels.forEach((w) => {
		w.endDrag()

		if(!wheelInTesla(w.x, w.y)){
			wheelsInTesla = false;
		}
	});

	if(wheelsInTesla){
		console.log('wheels in')
		teslaFinished = true
		tesla.dx = -5;
		wheel1.dx = -5;
		wheel2.dx = -5;
	}
}

function getMeanTeslaTime(){
	var meanTeslaTime = 0;
	teslaTimes.forEach((t)=>{
		meanTeslaTime += t
	})
	return meanTeslaTime/teslaTimes.length;
}

function getBossHappiness(){
	meanTeslaTime = getMeanTeslaTime();
	return ((parseInt(Math.min(1, 2500/meanTeslaTime)*100)/100)*3.0 + Math.random())/4.0
}