

//               Calculator display

// This is a window that displays multiple lines of calculator entries.
// The contents are sent via a call to render(s) which expects an HTML representation of the entire contents,
// which are replaced completely on every call

	function CalcDisplay(xLoc, yLoc, wid, ht)  // constructor
	{   this.type = "CalcDisplay";
		this.bgColor = 0x777777;
		this.div = false;

		//Make a div to act as the display
		this.div = document.createElement('div');
		this.div.id = "displayDiv";
		this.div.className = "displayDiv";
	   
		applet.appendChild(this.div);//attach to parent

	  this.paint = function()
		{ var xOff = canvas.offsetLeft;
          var yOff = canvas.offsetTop;   

          with(this.div.style)
			{ position = "absolute";
			  top      = (yLoc*bScale) + yOff + "px";
			  left     = (xLoc*bScale) + xOff + "px";
			  width    = wid*bScale+"px";
			  height   = ht*bScale+"px";
			  fontSize = (15*bScale)+"px";   
			  borderWidth = 3*bScale +"px";
			  paddingTop  = 5*bScale+"px";
			}
		};


	  this.render = function(s)
		{ var div = document.getElementById("displayDiv");
		  div.innerHTML = s;
		  div.scrollTop = div.scrollHeight;

		};

}; //class











function CalcButton( wid, ht, xLoc, yLoc, legendCol, bgCol, legend, retValue, sup, sub, legendPercent)
{
    this.type        = "CalcButton";
	this.xLoc = xLoc;
	this.yLoc = yLoc;
	this.wid  = wid;
	this.ht   = ht; 
	this.retValue = retValue;

	this.sup         = (sup==undefined)? "" : sup;
	this.sub         = (sub==undefined)? "" : sub;
    this.legendScale =  (legendPercent==undefined)?  1 : legendPercent/100; //scale to grow/shrink font size
	this.hoverText   = "";
	this.border      = false;

    var legendFontSize = Math.round(13*this.legendScale); //px
    var supsubFontSize = Math.round(10*this.legendScale); //px

    //register this object with the cursor
    csr.register(this);

	//private props
	this.box = {x:0, y:0, wid:0, ht:0};
	this.inBox = false;  // true when mouse is inside the bounding box


    // constructor ends




    this.setHoverText = function(txt, border)
    //sets a value into the title so it will apeear in a mouse hover.
    //Also if border=true sets a border ( usually to show the mem has a value stored in it).
    { this.hoverText = txt;
	  this.border = border;
	  repaint();
    };


	this.update = function() {};

	this.reset = function() {};

	this.paint = function()
    { //draw background and border.  We draw it into the host applet context
     with(context)
		{ save();

			  translate(xLoc, yLoc);  // set the origin to the button location

			  fillStyle = toStr(bgCol);
			  fillRect(0,0, wid, ht);   

			  //vert rt & horiz lower indent
			  beginPath();
			  strokeStyle = "#ffffff";
			  lineWidth = 1;
			  moveTo(0 , ht-0.5);
			  lineTo(wid-0.5 , ht-0.5);
			  lineTo(wid-0.5 , 1.5);
			  stroke();

			  //button top left outdent
			  beginPath();
			  strokeStyle = "#ffffff";
			  moveTo(1.5 , 1.5);
			  lineTo(1.5 , ht-1.5);
			  moveTo(1.5 , 1.5);
			  lineTo(wid-2.5 , 1.5);
			  stroke();

			  //button bottom % & rt outdent
			  beginPath();
			  strokeStyle = "#646464";
			  moveTo(1.5 , ht-1.5);
			  lineTo(wid-1.5 , ht-1.5);
			  lineTo(wid-1.5 , 2.5);
			  stroke();



			  //get  legend  width(s) (legend and any superscript / subscript
			  font = "bold "+legendFontSize+"px sans-serif";
			  var legendWid = measureText(legend).width;

			  font = "bold "+supsubFontSize+"px sans-serif";
			  var supWid = measureText(this.sup).width;
			  var subWid = measureText(this.sub).width;

			  var totalWid = legendWid + supWid + subWid;


			  var legendY = (ht+legendFontSize)/2;  //text y is baseline of text
			  var legendLeft = (wid-totalWid)/2;  //center

			  //draw legend itself
			  font = "bold "+legendFontSize+"px sans-serif";
			  fillStyle = toStr(legendCol); //toStr(legendCol);
			  fillText(legend, legendLeft, legendY-1.5);

			 //do any super / subscripts
			 font = "bold "+supsubFontSize+"px sans-serif";
			 if(this.sub.length>0) fillText(this.sub, legendLeft+legendWid+1, legendY+1.5);
			 if(this.sup.length>0) fillText(this.sup, legendLeft+legendWid+1, legendY-3.5);

		  restore();
        }
    };



    this.contains = function(x,y)
	{ var within = x > this.xLoc   &&   x < (this.xLoc+this.wid)   &&   y > this.yLoc  &&   y < (this.yLoc+ht);
	  return within;
	}



    this.consumed = function(p)
	  { // checks to see if this object wants to process the event.  If it does return true
		var inside = this.contains(p.x, p.y);

		switch(p.type)
		  { case "mousedown":
			case "touchstart":
				if(inside)
				  { this.pressed(this.retValue);
					return true;
				  }
				 return false;
				 break;
				 
			case "mousemove":   //decide to display pointer csr
				 if(inside && !this.inBox) //csr should turn on
					  { this.inBox = true;
					    canvas.style.cursor = "pointer";
					  }
				 
				 if(this.inBox && !inside)  //csr should turn off
					  { this.inBox = false;
					    canvas.style.cursor = "auto"; 
					  }

				 return inside;				
				 break;
		  }
	  };


	this.pressed = function(retValue)
        // When a button is pressed, we call the handler in the global skin object.
        // The return value is sent as a parameter so it knows what to do with it.
		{ if (!e) var e = event;
	      e.preventDefault();
          skin.buttonPressed(retValue);
		};

};






function CalcCompiledObject()
// Holds the compiled expression.  Can also hold an error state.
// The function doCompile() instantiates them with a 'new' call and hands them back to the caller for saving.
// Then they can be passed to doEval() for execution.
{   this.type = "CalcCompiledObject";
    this.polishArray = [];  //the compiled code itself
	this.errorMes   = "";
	this.errorStatus = 0;
};





function xxxCalcButton( wid, ht, xLoc, yLoc, legendCol, bgCol, legend, retValue, sup, sub, legendPercent)
{
    this.type        = "CalcButton";
	this.sup         = (sup==undefined)? "" : sup;
	this.sub         = (sub==undefined)? "" : sub;
    this.legendScale =  (legendPercent==undefined)?  1 : legendPercent/100; //scale to grow/shrink font size

    this.buttnCan = false;
    this.buttnCtx = false;

    var legendFontSize = Math.round(13*this.legendScale); //px
    var supsubFontSize = Math.round(10*this.legendScale); //px


    //make a canvas
    this.buttnCan = document.createElement('canvas');
	with( this.buttnCan)
		{  with(style)
	         { position = "absolute";
               cursor   = "pointer";
            }
		  height = ht * bScale;
          width  = wid * bScale;
       }

    //attach it to host window
	applet.appendChild(this.buttnCan);
    this.buttnCtx = this.buttnCan.getContext('2d');

	/*set scale now, since changing wid/ht cancels the scale()
    this.buttnCtx.scale(bScale, bScale);

	//position the canvas (button)
	this.buttnCan.style.left = (xLoc*bScale)+"px";
	this.buttnCan.style.top  = (yLoc*bScale)+"px";
	*/

    //Attach the ret value as a property of the canvas, so event handlers can see it.
    this.buttnCan.retValue = retValue;

    //draw background and border
    with(this.buttnCtx)
		{
          fillStyle = toStr(bgCol);
		  fillRect(0,0, wid, ht);

          //vert rt & horiz lower indent
          beginPath();
          strokeStyle = "#ffffff";
          lineWidth = 1;
          moveTo(0 , ht-0.5);
          lineTo(wid-0.5 , ht-0.5);
          lineTo(wid-0.5 , 1.5);
          stroke();

          //button top left outdent
          beginPath();
          strokeStyle = "#ffffff";
          moveTo(1.5 , 1.5);
          lineTo(1.5 , ht-1.5);
          moveTo(1.5 , 1.5);
          lineTo(wid-2.5 , 1.5);
          stroke();

          //button bottom % & rt outdent
          beginPath();
          strokeStyle = "#646464";
          moveTo(1.5 , ht-1.5);
          lineTo(wid-1.5 , ht-1.5);
          lineTo(wid-1.5 , 2.5);
          stroke();

          //get  legend  width(s) (legend and any superscript / subscript
          font = "bold "+legendFontSize+"px sans-serif";
          var legendWid = measureText(legend).width;

          font = "bold "+supsubFontSize+"px sans-serif";
          var supWid = measureText(this.sup).width;
          var subWid = measureText(this.sub).width;

          var totalWid = legendWid + supWid + subWid;


          var legendY = (ht+legendFontSize)/2;  //text y is baseline of text
          var legendLeft = (wid-totalWid)/2;  //center

          //draw legend itself
          font = "bold "+legendFontSize+"px sans-serif";
          fillStyle = toStr(legendCol); //toStr(legendCol);
          fillText(legend, legendLeft, legendY-1.5);

         //do any super / subscripts
         font = "bold "+supsubFontSize+"px sans-serif";
         if(this.sub.length>0) fillText(this.sub, legendLeft+legendWid+1, legendY+1.5);
         if(this.sup.length>0) fillText(this.sup, legendLeft+legendWid+1, legendY-3.5);
        };




	this.pressed = function(e)
        // When a button is pressed, we call the handler in the global skin object.
        // The return value is sent as a parameter so it knows what to do with it.
        // So the event handler can see it, the ret value is stored as a property of the button instance.
		{ if (!e) var e = event;
	      e.preventDefault();
          var retVal = e.target.retValue;
          skin.buttonPressed(retVal);
		};


    this.setHoverText = function(t, border)
    //sets a value into the title so it will apeear in a mouse hover.
    //Also if border=true sets a border ( usually to show the mem has a value stored in it).
    {  with(this.buttnCan)
		{ title = t;
          if(border)
			 style.border="1px solid black";
          else
             style.border = "none";
        }

    };


	this.update = function() {};

	this.reset = function() {};

	this.paint = function()
    {  // Attach event handlers.   This cannot be done in the constructor because the handler function does not exist yet.
       if (!onmousedown)
          with(this.buttnCan)
			{ onmousedown  = this.pressed;
			  ontouchstart = this.pressed;
			}

			   this.buttnCtx.scale(bScale, bScale);

	//position the canvas (button)
	this.buttnCan.style.left = (xLoc*bScale)+"px";
	this.buttnCan.style.top  = (yLoc*bScale)+"px";
    };

};









//     Calculator Skin - the front panel

function CalcSkin()  // constructor

{
    this.type = "CalcSkin";
	this.display;
	this.printer;
	this.angleUnits;
	this.placesSelector;
	this.printBtn;
	this.sizeBtn;
	this.outlineColor = 0x444444;
	this.places=2;   //number places to display
	this.store;
	this.mpVal;
	this.compobjExp;

	this.placesCallback;
	this.printCallback;

	var buttonWidths = 80;

	// override the normal applet background to panelColor
	applet.style.background = "#C0c0c0";
	applet.style.border = "1px solid #555";

	//Create the store
	store = new  CalcStore();

	//Set up the parser
	mpVal = new CalcParser(["ans","a","b","c","d"]);  //At eval time, send doEval()) these values in this order
	compobjExp = new CalcCompiledObject();


	//add the display window
	this.display = new CalcDisplay(200,20, 360, 165);
	addChild(this.display);

	//add degs/rads selector
	addChild(angleUnits = new ComboBox(angleChange,12) );
	with(angleUnits)
		{ x     = 65;
		  y     = 120;
		  height= 21;
		  width = buttonWidths;
		  addItem({label:"Radians"});
		  addItem({label:"Degrees"});
		}
    angleUnits.selectOption(1);

		function angleChange(event)
		  { degreesMode = (angleUnits.selectedIndex==1);
		  }



	//Decimal places selector
	addChild(placesSelector = new ComboBox(placeChange,12) );
	with(placesSelector)
		{ x      = 65;
		  y      = 80;
		  height = 21;
		  width  = buttonWidths;
		  addItem( {label: "1 place"} );
		  for(var i=2; i<8; i++)  addItem( {label: i+" places"} );
		  selectedIndex = this.places-1;
		}
    placesSelector.selectOption(1);

		function placeChange(event)
		  { skin.places = placesSelector.selectedIndex+1;
		  }


	//Add the print button
	addChild(this.printBtn = new Button() );
	with(this.printBtn)
		{ label  = "Print ";
		  x      = 20;
		  y      = 30;
		  height = 21;
		  width  = 70;
          callback = doPrint;
		}

		function doPrint(event)
		  { skin.printRun();
		  }


	//"size" button
	addChild(this.sizeBtn = new Button());
	with(this.sizeBtn)
		{ label  = "Full size";
		  x      = 110;
		  y      = 30;
		  height = 21;
		  width  = 70;
          callback = doSize.bind(this);
		}

		function doSize(e)  //called when the button is pressed
		{ if(this.sizeBtn.label == "Normal")
			{ goNormalScreen();
			}
          else
            { goFullScreen();
		    }
		}

    onScreenSizeChange(sizeChanged.bind(this));  //rescaler

		function sizeChanged(e) //event fired when the screen size changes full/normal
		{ console.log("size event");
		  if(this.sizeBtn.label == "Normal")
			this.sizeBtn.label = "Full Size";
		  else
            this.sizeBtn.label = "Normal";

		  setAppletSize();
		  update();
		}



	//key colors t=text, bg=background
	var fbg = 0x888888;
	var ft  = 0xffff64;
	var nt  = 0xFFFFFF;
	var nbg = 0x447799;
	var ct  = 0xFFFFFF;
	var cbg = 0x669999;
	var ebg = 0x668888;
	var eqc = 0x666666;

	// function key group
	var fx = 25,  fy = 210, xGap = 14, yGap =10, fWid = 50, fHt = 25, row5Wid = 38;

	addChild ( new CalcButton(fWid, fHt, fx,               fy,              ft, fbg, "sin",    "sin(" , "", "", 110           ) );
	addChild ( new CalcButton(fWid, fHt, fx+fWid+xGap,     fy,              ft, fbg, "cos",    "cos(" , "", "", 110            ) );
	addChild ( new CalcButton(fWid, fHt, fx+2*fWid+2*xGap, fy,              ft, fbg, "tan",    "tan(" , "", "", 110            ) );

	addChild ( new CalcButton(fWid, fHt, fx,               fy+fHt+yGap,     ft, fbg, "sin",    "asin(","-1", "", 110      ) );
	addChild ( new CalcButton(fWid, fHt, fx+fWid+xGap,     fy+fHt+yGap,     ft, fbg, "cos",    "acos(","-1", "", 110      ) );
	addChild ( new CalcButton(fWid, fHt, fx+2*fWid+2*xGap, fy+fHt+yGap,     ft, fbg, "tan",    "atan(","-1", "", 110     ) );

	addChild ( new CalcButton(fWid, fHt, fx,               fy+2*fHt+2*yGap, ft, fbg, "\u221a", "sqrt(" , "", "", 110           ) );
	addChild ( new CalcButton(fWid, fHt, fx+fWid+xGap,     fy+2*fHt+2*yGap, ft, fbg, "log",    "log(", "", "10", 110  ) );
	addChild ( new CalcButton(fWid, fHt, fx+2*fWid+2*xGap, fy+2*fHt+2*yGap, ft, fbg, "10",     "10^(", "x", "", 110       ) );

	addChild ( new CalcButton(fWid, fHt, fx,               fy+3*fHt+3*yGap, ft, fbg, "x",      "^2","2", "", 110          ) );
	addChild ( new CalcButton(fWid, fHt, fx+fWid+xGap,     fy+3*fHt+3*yGap, ft, fbg, "log",    "ln(" , "", "e",110   ) );
	addChild ( new CalcButton(fWid, fHt, fx+2*fWid+2*xGap, fy+3*fHt+3*yGap, ft, fbg, "e",      "exp(", "x", "", 110       ) );

	addChild ( new CalcButton(fWid, fHt, fx,                  fy+4*fHt+4*yGap, nt, nbg, "(",       "("        ) );
	addChild ( new CalcButton(fWid, fHt, fx+1*fWid+1*xGap,    fy+4*fHt+4*yGap, nt, nbg, ")",       ")"        ) );
	addChild ( new CalcButton(fWid, fHt, fx+2*fWid+2*xGap ,   fy+4*fHt+4*yGap, nt, fbg, "undo", "undo"        ) );


    //control group
	addChild ( new CalcButton(60, fHt, 25,  165, ft, fbg, "Clear", "clr"          ) );
	addChild ( new CalcButton(60, fHt, 120, 165, ft, fbg, "\u2190del", "del"    ) );


	//constants group
	var cx = 225,  cy = fy, cXGap = 7, cYGap =10, cWid = 35, cHt = 25, cxPitch = cXGap+cWid;
	addChild ( new CalcButton(cWid, cHt, cx, cy,           ct, cbg, "\u03C0",  "pi", "", "", 110      ) );
	addChild ( new CalcButton(cWid, cHt, cx+1*cxPitch, cy, ct, cbg, "e",       "e", "", "", 110       ) );
	addChild ( new CalcButton(cWid, cHt, cx+2*cxPitch, cy, ct, cbg, "\u221a2", "sqrt(2)", "", "", 110 ) );
	addChild ( new CalcButton(cWid, cHt, cx+3*cxPitch, cy, ct, ebg, "ans",     "~aans~~", "", "", 110 ) );


    //memory group
    var mx=225, mY = 280, mY2= 316, mWid=35,  mHt=25, mPitch=mWid+7, mt=0xffffff, mBg=0x669999;
	addChild ( memA = new CalcButton(mWid, mHt, mx+0*mPitch,  mY, mt, mBg, "A",    "~aA~~" , "", "", 100           ) );
	addChild ( memB = new CalcButton(mWid, mHt, mx+1*mPitch,  mY, mt, mBg, "B",    "~aB~~" , "", "", 100           ) );
	addChild ( memC = new CalcButton(mWid, mHt, mx+2*mPitch,  mY, mt, mBg, "C",    "~aC~~" , "", "", 100           ) );
	addChild ( memD = new CalcButton(mWid, mHt, mx+3*mPitch,  mY, mt, mBg, "D",    "~aD~~" , "", "", 100           ) );

	var mBg2=eqc, ft2 = 0xffff64;
    addChild ( new CalcButton(mWid, mHt, mx+0*mPitch, mY2, ft2, mBg2, "set",   "seta" , "", "", 85           ) );
	addChild ( new CalcButton(mWid, mHt, mx+1*mPitch, mY2, ft2, mBg2, "set",   "setb" , "", "", 85           ) );
	addChild ( new CalcButton(mWid, mHt, mx+2*mPitch, mY2, ft2, mBg2, "set",   "setc" , "", "", 85           ) );
	addChild ( new CalcButton(mWid, mHt, mx+3*mPitch, mY2, ft2, mBg2, "set",   "setd" , "", "", 85           ) );

	//num pad group
	var nx = 404,  ny = fy, nXGap = 10, nYGap =10, nWid = 35, nHt = 25;
	addChild ( new CalcButton(nWid, nHt, nx,                ny,                nt, nbg, "7",      "7" ) );
	addChild ( new CalcButton(nWid, nHt, nx+nWid+nXGap,     ny,                nt, nbg, "8",      "8" ) );
	addChild ( new CalcButton(nWid, nHt, nx+2*nWid+2*nXGap, ny,                nt, nbg, "9",      "9" ) );
	addChild ( new CalcButton(nWid, nHt, nx+3*nWid+3*nXGap, ny,                nt, nbg, "\u00F7", "/", "", "", 130) );

	addChild ( new CalcButton(nWid, nHt, nx,                ny+nHt+nYGap,      nt, nbg, "4",      "4" ) );
	addChild ( new CalcButton(nWid, nHt, nx+nWid+nXGap,     ny+nHt+nYGap,      nt, nbg, "5",      "5" ) );
	addChild ( new CalcButton(nWid, nHt, nx+2*nWid+2*nXGap, ny+nHt+nYGap,      nt, nbg, "6",      "6" ) );
	addChild ( new CalcButton(nWid, nHt, nx+3*nWid+3*nXGap, ny+nHt+nYGap,      nt, nbg, "\u00D7", "*" , "", "", 130) );

	addChild ( new CalcButton(nWid, nHt, nx,                ny+2*nHt+2*nYGap,  nt, nbg, "1",       "1") );
	addChild ( new CalcButton(nWid, nHt, nx+nWid+nXGap,     ny+2*nHt+2*nYGap,  nt, nbg, "2",       "2") );
	addChild ( new CalcButton(nWid, nHt, nx+2*nWid+2*nXGap, ny+2*nHt+2*nYGap,  nt, nbg, "3",       "3") );
	addChild ( new CalcButton(nWid, nHt, nx+3*nWid+3*nXGap, ny+2*nHt+2*nYGap,  nt, nbg, "\u2013", "-" , "", "", 130) );

	addChild ( new CalcButton(nWid, nHt, nx,                ny+3*nHt+3*nYGap,  nt, nbg, "0",      "0" ) );
	addChild ( new CalcButton(nWid, nHt, nx+nWid+nXGap,     ny+3*nHt+3*nYGap,  nt, nbg, ".",      "." ) );
	addChild ( new CalcButton(nWid, nHt, nx+2*nWid+2*nXGap, ny+3*nHt+3*nYGap,  nt, nbg, "E",      "epwr" ) );
	addChild ( new CalcButton(nWid, nHt, nx+3*nWid+3*nXGap, ny+3*nHt+3*nYGap,  nt, nbg, "+",      "+" , "", "", 130) );

	addChild ( new CalcButton(nWid, nHt, nx+3*nWid+3*nXGap, ny+4*nHt+4*nYGap,  nt, nbg, "^",      "^", "", "", 130 ) );

	addChild ( new CalcButton(124,  nHt, nx,                ny+4*nHt+4*nYGap,   ft, eqc, "=",     "=" , "","",140) );








    this.init = function(bigVersion)
	// We cannot do this is the constructor because stage is null until this is added to the display list
	{  onkeydown = this.keyDown;
       onkeypress = this.keyPress;
	   if (bigVersion)
		  sizeBtn.label = "Close";

       memA.setHoverText("Not set",false);
       memB.setHoverText("Not set",false);
       memC.setHoverText("Not set",false);
       memD.setHoverText("Not set",false);
	};


	this.keyDown = function(event)
    //catch the control keys like backspace
    {
	  var keyCode = event.keyCode;  //for keydown, keyCode is the key id, not the ascii value of it

      switch(keyCode)
		{ case 13:  key = "=";    break;  //either enter key
		  case 37:  //same as 8, fall through
          case 8:   key = "del";  break;  //8=backspace 37=left arrow
          case 46:  key = "undo"; break;  //del key

          //If the above intecepts don't trigger, do nothing.  The keypress handler will catch it
          default:  return;
		}

      skin.input(key, "kbd");
      return false;  //false means that keypress will not fire
	};



    this.keyPress = function(event)
	{
	  var charCode = event.charCode;  //for keypress, keyCode is the  ascii value of it
      if(charCode>0)
          { skin.input(String.fromCharCode(charCode), "kbd");
          }
	  return(false);
	};


	this.buttonPressed = function(retValue)
	{ //process the button press
	  window.focus();  //make sure kbd events continue
      this.input(retValue, "button");
	};


	this.render = function()
	{ this.display.render(store.asHTML(true));  //scaled
	};



	this.input = function(str, source)
	// str is the input string, source is "kbd" or "button"
	{ var newResult;

	  switch(str)
		  {case "del":  store.chop(); //delete last item appended()
						break;

		   case "undo": store.undo();
						break;

		   case "=":    this.doChaining(str);
						newResult = this.result();
						var croppedResult = this.adjust(newResult, this.places);
						store.append(" = "+"~a"+croppedResult+"~~");
						store.saveResult(newResult);
						store.startNewEntry();
						break;

		   case "clr":  //clear entire calc
						store.clear();
						break;

		   case "seta": //store current result in mem A
						store.setMem("a", memA);
						break;

		   case "setb": //store current result in mem B
						store.setMem("b", memB);
						break;

		   case "setc": //store current result in mem C
						store.setMem("c", memC);
						break;

		   case "setd": //store current result in mem C
						store.setMem("d", memD);
						break;

		   default:     //most buttons and keys come here
						this.doChaining(str);
						store.append(str);
						break;
		  }
	  this.render();
	};


	this.result = function()
	// Evaluates the expression on the top of the stack and
	// returns its numeric value in full precision
	{   this.doFixups();
		var expression = store.getParsableExpr();
		compiledExpr = doCompile(expression);
		var res =  doEval(compiledExpr.PolishArray, [store.ans() , store.memory['a'], store.memory['b'], store.memory['c'], store.memory['d'] ] );
		return res;
	};


	this.doFixups = function()
	{  this.attachArgument();
	   this.danglingOperator();
	   this.balanceParens();

	};


	this.balanceParens = function()
	// Adds enough trailing parens to make them balance.
	// Does not remove any if already too many though.  User will get error
	{ var exp = store.getExprStr();
	  var count = 0;
	  var chr;

	  for (var i=0; i<exp.length; i++)
		{  chr = exp.charAt(i);
		   if (chr=="(") count++;
		   if (chr==")") count--;
		}

	  for(; count>0; count--)
		exp += ")";

	  store.replace(exp);
	};


	this.attachArgument = function()
	// If the last thing on the line is the name of a single-argument function,
	// insert the ANS as the argument
	{  var functionNames = f1Array; //list of single-arg function names
	   var exp = store.getExprStr();
	   if(exp.charAt(exp.length-1) == "(") //trailing left paren
		 {   for(var i=0; i<functionNames.length; i++)
				{ var name = functionNames[i];
                  var funNameInExpr = exp.substring(exp.length-name.length-1 , exp.length-1);
                  if(funNameInExpr  == name)
					{ //unclosed function found
					  exp += "~aans~~)";
					  store.replace(exp);
					  return;
					}
				}
		 }
	};


	this.danglingOperator = function()
	// If the expression ends with a dangling operator (+-*/^)
	// complete it with ans
	{   var exp = store.getExprStr();
        var ops = ["+" , "-" , "*" , "/" , "^"];
		if (exp.length>1)
			{ for(var i=0; i<ops.length; i++)
				{ var operator = ops[i];
                  if(exp.charAt(exp.length-1) == operator)
					{ //dangling operator
					  exp += "~aans~~";  //the ~a and ~~ cause it to highlight yellow
					  store.replace(exp);
					  return;
					}
				}
			}
	};


	this.doChaining = function(input)
	// If this is the first item on a line and begins with an operator, prepend "ans"
	// by returning the input with "ans" in front.  Called on every input event
	// but only has an effect on the first one in an expression
	{ var exp = store.getExprStr();
	  var chr = input.charAt(0); //buttons might have str.length>0
      var ops = ["+" , "-" , "*" , "/" , "^", "="];

	  if ( store.getExprStr().length==0 ) //first thing in a new expression
		  for(var i=0; i<ops.length; i++)
             { if(chr == ops[i]) //chained operator
				  store.append( "~aans~~"); //the ~a and ~~ cause it to highlight yellow
             }
	};


	this.adjust = function(n, p)
	//Returns n rounded to p significant digits
	{
	   //first figure out how many zeros there are after the point
	   var str = n+"";   //will always produce a non-zero digit somewhere after the point if there is a point
	   var inx,i;
	   var numZeros=0;
	   inx = str.indexOf(".");
	   if(inx > 0) //Has dec places
		   { i=inx+1;
			 while (str.charAt(i) == "0")    i++;
			 numZeros = i-inx-1;
		   }

	   //Round n so it has p sig digits
	   numPlaces = numZeros+p;
	   factor = Math.pow(10,numPlaces);
	   return Math.round(n*factor)/factor;
	};



this.printRun = function()
{ var printFrameWindow = document.getElementById("printIFrame").contentWindow ;

  //push the print results into the target print frame
  var printBuff = printFrameWindow.document.getElementById("printBuffer");
  printBuff.innerHTML = store.asHTML(); //not scaled

  printFrameWindow.focus();
  printFrameWindow.print();
};



this.paint = function() {};


}; //class















var f1Array = ["sin", "cos", "tan", "log", "ln", "sqrt", "exp", "abs", "acos","asin", "atan" ,"ceil", "floor", "round"];
var f2Array = ["max","min","plus","minus","mul","div","pow"];
var degreesMode = true;

var iserror;
var errorMes;
var tokenvalue;
var tokentype;
var tokenlength;
var nums  = "0123456789.";
var lets  = "abcdefghijklmnopqrstuwvxzy";
var opers = "^*+-/(),";
var aVarNames ;


function CalcParser(varArray )
{
	if (varArray.length==0)
       { aVarNames=[];
	   }
    else
       { aVarNames=setVars(varArray);
	   }
	this.iserror=0;
	this.errorMes="";
};


function setVars(v )
{   var tranNames =[];
	for ( var i=0; i<v.length; i++)
       { if ((typeof v[i])!="string")
             { trace("All variables must be entered as strings into MathParser constructor. Don't forget quotation marks.");
	         }
	     tranNames[i]=v[i].toLowerCase();
       }
	return tranNames;
};


function doCompile(inputstring)
{
	var coCompObj=new CalcCompiledObject();
	var stepString;
	var conString;
	var fstack =[];
	iserror=0;
	errorMes="";
	stepString=whiteSpaces(inputstring);

	if (stepString=="") {
		coCompObj.PolishArray=[];
		coCompObj.errorMes="";
		coCompObj.errorStatus=0;
		return coCompObj;
	}
	checkLegal(stepString);

	if (iserror==1) {
		coCompObj.PolishArray=[];
		coCompObj.errorMes=errorMes;
		coCompObj.errorStatus=1;
		return coCompObj;
	}
	checkPars(stepString);

	if (iserror==1) {
		coCompObj.PolishArray=[];
		coCompObj.errorMes=errorMes;
		coCompObj.errorStatus=1;
		return coCompObj;
	}
	checkToks(stepString);

	if (iserror==1) {
		coCompObj.PolishArray=[];
		coCompObj.errorMes=errorMes;
		coCompObj.errorStatus=1;
		return coCompObj;
	}
	conString=conOper(conOper(conOper(conOper(conUnary(conCaret(stepString)),"/"),"*"),"-"),"+");

	if (iserror==1) {
		coCompObj.PolishArray=[];
		coCompObj.errorMes=errorMes;
		coCompObj.errorStatus=1;
		return coCompObj;
	}
	fstack=makeStack(conString);

	if (iserror==1) {
		coCompObj.PolishArray=[];
		coCompObj.errorMes=errorMes;
		coCompObj.errorStatus=1;
		return coCompObj;
	} else {
		coCompObj.PolishArray=fstack;
		coCompObj.errorMes="";
		coCompObj.errorStatus=0;
		return coCompObj;
	}
};


function istokf1(chars)
{
	for (var i=0; i< f1Array.length; i++) {
		if (chars == f1Array[i]) {
			return true;
		}
	}
	return false;
};


function isVar(chars)
{
	for (var i=0; i< aVarNames.length; i++) {
		if (chars == aVarNames[i]) {
			return true;
		}
	}
	return false;
};


function istokf2(chars)
{
	for (var i=0; i< f2Array.length; i++) {
		if (chars == f2Array[i]) {
			return true;
		}
	}
	return false;
};


function isLet(char)
{   return lets.indexOf(char) >= 0;
};


function isOper(char)
{  return opers.indexOf(char) >= 0;
};


function isNum(char)
{  return nums.indexOf(char) >= 0;
};


function setToken(curtype,curvalue,curlength)
{
	tokentype=curtype;
	tokenvalue=curvalue;
	tokenlength=curlength;
};


function nextToken(inputstring,pos)
{
	var char, t, inilen, cpos, cstring;
	cstring=inputstring;
	cpos=pos;
	inilen=inputstring.length;

	if (cpos >= inilen || cpos<0) {
		return false;
	} else {
		char=cstring.charAt(cpos);
		if (isLet(char)) {
			t=char;
			do {
				cpos+=1;
				if (cpos >= inilen) {
					break;
				}
				char=cstring.charAt(cpos);
				if (!isLet(char)) {
					break;
				}
				t+=char;
			} while (1);

			if (istokf1(t)) {
				setToken("f1",t, t.length);
				return true;
			} else if (istokf2(t)) {
				setToken("f2",t, t.length);
				return true;
			} else {
				setToken("v",t,t.length);
				return true;
			}
		}
		if (isNum(char)) {
			t=char;
			do {
				cpos+=1;
				if (cpos >= inilen) {
					break;
				}
				char=cstring.charAt(cpos);
				if (!isNum(char)) {
					break;
				}
				t+=char;
			} while (1);
			setToken("n",t,t.length);
			return true;
		}
		if (isOper(char)) {
			setToken("oper",char,1);
			return true;
		}
		return false;
	}
};


function checkToks(inputstring)
{
	var pstring, pinilen, ppos, fpos, bpos, fchar,
	bchar, counter, matchpar, iscomma, comcounter;
	pstring=inputstring;
	ppos=0;
	counter=0;
	comcounter=0;
	pinilen=pstring.length;
	if (pstring.indexOf("---")>=0) {
		callError("No need for so many minuses.");
		return;
	}
	while (ppos < pinilen && counter<pinilen*2) {
		if (nextToken(pstring,ppos)) {
			fpos=ppos+tokenlength;
			fchar=pstring.charAt(fpos);
			bpos=(ppos-1);
			bchar=pstring.charAt(bpos);
			if (tokentype=="f1") {
				if (!(fchar=="(")) {
					callError("'(' expected at position " + fpos +".");
					return;
				}
				if (ppos > 0 && !(isOper(bchar))) {
					callError("Operator expected at position " + bpos +".");
					return;

				}
				if (ppos > 0 && bchar==")") {
					callError("Operator expected at position " + bpos +".");
					return;
				}
			}
			if (tokentype=="f2") {
				if (!(tokenvalue=="max") && !(tokenvalue=="min")) {
					callError("Unknown functions at position " + fpos +".");
					return;
				}
				if (!(fchar=="(")) {
					callError("'(' expected at position " + fpos +".");
					return;
				} else {
					matchpar=1;
					iscomma=0;
					comcounter=0;
					while (matchpar>0 && comcounter<pinilen) {
						comcounter+=1;
						if (pstring.charAt(fpos+comcounter)=="(") {
							matchpar+=1;
						}
						if (pstring.charAt(fpos+comcounter)==")") {
							matchpar+=-1;
						}
						if (pstring.charAt(fpos+comcounter)==",") {
							iscomma+=1;
						}
					}
					if (iscomma==0) {
						callError("Two arguments expected for function at position " + ppos +".");
						return;
					}
				}
				if (ppos > 0 && !(isOper(bchar))) {
					callError("Operator expected at position " + bpos +".");
					return;

				}
				if (ppos > 0 && bchar==")") {
					callError("Operator expected at position " + bpos +".");
					return;
				}
			}
			if (tokentype=="v") {
				if (!(isVar(tokenvalue) || tokenvalue=="pi" || tokenvalue=="e")) {
					callError("Unknown entries at position " + ppos +".");
					return;
				}
				if (ppos > 0 && !(isOper(bchar))) {
					callError("Operator expected at position " + bpos +".");
					return;
				}
				if (ppos > 0 && bchar==")") {
					callError("Operator expected at position " + bpos +".");
					return;
				}
				if (fpos < pinilen && !(isOper(fchar))) {
					callError("Operator expected at position " + fpos +".");
					return;
				}
				if (fpos < pinilen && fchar=="(") {
					callError("Operator expected at position " + fpos +".");
					return;
				}
			}
			if (tokentype=="n") {
				if (ppos > 0 && !(isOper(bchar))) {
					callError("Operator expected at position " + bpos +".");
					return;
				}
				if (ppos > 0 && bchar==")") {
					callError("Operator expected at position " + bpos +".");
					return;

				}
				if (fpos < pinilen && !(isOper(fchar))) {
					callError("Operator expected at position " + fpos +".");
					return;

				}
				if (fpos < pinilen && fchar=="(") {
					callError("Operator expected at position " + fpos +".");
					return;
				}
			}
			if (tokenvalue=="(") {
				if (fpos < pinilen && ("^*,)+/").indexOf(fchar)>=0) {
					callError("Entries expected at position " + fpos +".");
					return;
				}
			}
			if (tokenvalue==")") {
				if (fpos < pinilen && ("^*+-,/)").indexOf(fchar)==-1) {
					callError("Entries expected at position " + fpos +".");
					return;
				}
				if (bpos >=0 && ("^*+-,/(").indexOf(bchar)>=0) {
					callError("Entries expected at position" + fpos +".");
					return;

				}
			}
			if (tokenvalue==",") {
				if (ppos==0 || ppos==pinilen-1) {
					callError("Stray comma at position " + ppos +".");
					return;
				}
				if (fpos < pinilen && ("^*+,/)").indexOf(fchar)>=0) {
					callError("Entries expected at position " + fpos +".");
					return;
				}
				if (bpos >=0 && ("^*+-,/(").indexOf(bchar)>=0) {
					callError("Entries expected at position " + fpos +".");
					return;
				}
			}
			if (("^/*-+").indexOf(tokenvalue)>=0) {
				if (("+*^/),").indexOf(fchar)>=0) {
					callError("Entries expected at position " + fpos +".");
					return;
				}
				if (("+*^/(,").indexOf(bchar)>=0 && !(tokenvalue=="-")) {
					callError("Entries expected at position " + fpos +".");
					return;
				}
			}
		} else {
			callError("Unknown characters at position ." + ppos);
		}
		ppos+=tokenlength;
		counter+=1;

	}
};


function conOper(inputstring, char)
{
	var transtring, inilen, mco, curpos, leftoper, rightoper,leftmove,rightmove;
	inilen=inputstring.length;
	transtring=inputstring;
	if (transtring.indexOf(char)==-1) {
		return transtring;
	} else if (transtring.indexOf(char)==0 && !(char=="-")) {
		callError("Error at the first " + char);
		return "";
	} else if (transtring.charAt(transtring.length-1)==char) {
		callError("Error at the last " + char + ".");
		return "";
	} else {
		mco=0;
		while (transtring.indexOf(char)>0 && mco<inilen*6) {
			mco+=1;
			curpos=transtring.indexOf(char);
			leftmove=goLeft(transtring,curpos);
			if (iserror==1) {
				callError("Error at  " + char + "  number " + mco + ".");
				return "";
			} else {
				leftoper=transtring.substring(leftmove+1,curpos);
			}
			rightmove=goRight(transtring,curpos);
			if (iserror==1) {

				callError("Error at  " + char + "  number " + mco + ".");

				return "";
			} else {
				rightoper=transtring.substring(curpos+1, rightmove);
			}
			if (char=="*") {
				transtring=transtring.substring(0,leftmove+1)
						   +"mul("+ leftoper+ "," + rightoper + ")" +
				   transtring.substring(rightmove,transtring.length+1);
			}
			if (char=="/") {
				transtring=transtring.substring(0,leftmove+1)
						   +"div("+ leftoper+ "," + rightoper + ")" +
				   transtring.substring(rightmove,transtring.length+1);
			}
			if (char=="-") {
				transtring=transtring.substring(0,leftmove+1)
						   +"minus("+ leftoper + "," + rightoper + ")" +
				   transtring.substring(rightmove,transtring.length+1);
			}
			if (char=="+") {
				transtring=transtring.substring(0,leftmove+1)
						   +"plus("+ leftoper + "," + rightoper + ")" +
				   transtring.substring(rightmove,transtring.length+1);
			}
			if (transtring.length>inilen*7) {
				callError("Oooops!");
				return "";
			}
		}
		return transtring;
	}
};



function conUnary(inputstring)
{
	var transtring, inilen, mco, curpos, i, j;
	inilen=inputstring.length;
	transtring=inputstring;
	if (transtring.indexOf("-")==-1) {
		return transtring;
	}
	if (transtring.charAt(transtring.length-1)=="-") {
		callError("Error at the last minus.");
		return "";
	}

	for (i=0; i<transtring.length; i++) {
		if (transtring.charAt(i)=="-" && unaryId(transtring.charAt(i-1))) {
			j=goRight(transtring, i);
			if (iserror==1) {
				callError("Error at position " + i);
				return "";
			}
			transtring=transtring.substring(0,i)+"minus(0,"+transtring.substring(i+1,j) + ")" + transtring.substring(j,transtring.length);
		}
		if (transtring.length > 9*inilen) {
			callError("Ooops!");
			return "";
		}
	}
	return transtring;
};



function unaryId(char)
{
	if ("+-,(/*^".indexOf(char)>-1) {
		return true;
	} else {
		return false;
	}
};


function goRight(inputstring, pos)
{
	var rightchar, rightcounter, matchpar;
	rightchar=inputstring.charAt(pos+1);
	rightcounter=pos+1;
	if (rightchar=="-") {
		rightcounter+=1;
		if (rightcounter>=inputstring.length) {
			iserror=1;
			return rightcounter;
		} else {
			rightchar=inputstring.charAt(rightcounter);
		}
	}

	if (nums.indexOf(rightchar)>-1) {
		while (nums.indexOf(inputstring.charAt(rightcounter))>-1
		&& rightcounter<inputstring.length) {
			rightcounter+=1;
		}
	} else if (lets.indexOf(rightchar)>-1) {
		while (lets.indexOf(inputstring.charAt(rightcounter))>-1
		   && rightcounter<inputstring.length) {
			rightcounter+=1;
		}
		if (inputstring.charAt(rightcounter)=="(") {
			matchpar=1;
			while (matchpar>0 && rightcounter<inputstring.length) {
				rightcounter+=1;
				if (inputstring.charAt(rightcounter)=="(") {
					matchpar+=1;
				}
				if (inputstring.charAt(rightcounter)==")") {
					matchpar+=-1;
				}
			}
		}
		if (matchpar>0) {
			iserror=1;
			return rightcounter;
		}
	} else if (rightchar=="(") {
		matchpar=1;
		while (matchpar>0 && rightcounter<inputstring.length) {
			rightcounter+=1;
			if (inputstring.charAt(rightcounter)=="(") {
				matchpar+=1;
			}
			if (inputstring.charAt(rightcounter)==")") {
				matchpar+=-1;
			}
		}
		rightcounter+=1;

		if (matchpar>0) {
			iserror=1;
			return rightcounter;
		}
	} else {
		iserror=1;
		return rightcounter;
	}
	return rightcounter;
};



function goLeft(inputstring,pos)
{
	var leftchar, leftcounter, matchpar;
	leftchar=inputstring.charAt(pos-1);
	leftcounter=pos-1;
	if (nums.indexOf(leftchar)>-1) {
		while (nums.indexOf(inputstring.charAt(leftcounter))>-1 && leftcounter>=0) {
			leftcounter+=-1;
		}
	} else if (lets.indexOf(leftchar)>-1) {
		while (lets.indexOf(inputstring.charAt(leftcounter))>-1 && leftcounter>=0) {
			leftcounter+=-1;
		}
	} else if (leftchar==")") {
		matchpar=1;
		if (leftcounter==0) {
			iserror=1;
			return leftcounter;
		}
		while (matchpar>0 && leftcounter>0) {
			leftcounter+=-1;
			if (inputstring.charAt(leftcounter)==")") {
				matchpar+=1;
			}
			if (inputstring.charAt(leftcounter)=="(") {
				matchpar+=-1;
			}
		}
		leftcounter+=-1;
		if (matchpar>0) {
			iserror=1;
			return leftcounter;
		}
		if (leftcounter>=0 && nums.indexOf(inputstring.charAt(leftcounter))>-1) {
			iserror=1;
			return leftcounter;
		}
		if (leftcounter==0 && !(inputstring.charAt(leftcounter)=="-")
		&& !(inputstring.charAt(leftcounter)=="(")) {
			iserror=1;
			return leftcounter;
		}
		if (leftcounter>0 && lets.indexOf(inputstring.charAt(leftcounter))>-1) {
			while (lets.indexOf(inputstring.charAt(leftcounter))>-1 && leftcounter>=0) {
				leftcounter+=-1;
			}
		}
	} else {
		iserror=1;
		return leftcounter;
	}
	return leftcounter;
};



function conCaret(inputstring)
{
	var transtring, inilen, mco, curpos, leftmove,
	rightmove, base, expon;
	inilen=inputstring.length;
	transtring=inputstring;
	if (transtring.indexOf("^")==-1) {
		return transtring;
	} else if (transtring.indexOf("^")==0) {
		callError("Error at the first ^.");
		return "";
	} else if (transtring.charAt(transtring.length-1)=="^") {
		callError("Error at the last ^.");
		return "";
	} else {
		mco=0;
		while (transtring.indexOf("^")>0 && mco<inilen*6) {
			mco+=1;
			curpos=transtring.lastIndexOf("^");
			leftmove=goLeft(transtring,curpos);
			if (iserror==1) {
				callError("Error at ^ number " + mco + " from the end.");
				return "";
			} else {
				base=transtring.substring(leftmove+1,curpos);
			}
			rightmove=goRight(transtring,curpos);

			if (iserror==1) {
				callError("Error at ^ number " + mco + " from the end.");
				return "";
			} else {
				expon=transtring.substring(curpos+1, rightmove);
			}
			transtring=transtring.substring(0,leftmove+1)
					   +"pow("+ base+ "," + expon + ")" +
			   transtring.substring(rightmove,transtring.length+1);

			if (transtring.length>inilen*7) {
				callError("Oooops!");
				return "";
			}
		}
		return transtring;
	}
};


function whiteSpaces(inputstring)
{
	var curpos, transtring, inilen, counter=0;
	inilen=inputstring.length;
	transtring=inputstring.toLowerCase();
	while (transtring.indexOf(" ")>-1 && counter < inilen+1) {
		curpos=transtring.indexOf(" ");
		transtring=transtring.substring(0,curpos) +
		 transtring.substring(curpos+1,transtring.length);
		counter+=1;

	}
	return transtring;
};



function checkLegal(inputstring)
{
	var i, legal, curchar;
	if (inputstring=="") {
		callError("Empty input.");
		return false;
	}
	for (i=0; i<inputstring.length; i++) {
		curchar=inputstring.charAt(i);
		legal=nums.indexOf(curchar)+lets.indexOf(curchar)+opers.indexOf(curchar);
		if (legal==-3) {
			callError("Unknown characters.");
			return false;
		}
	}
	return true;
};



function checkPars(inputstring)
{
	var i, j, matchpar, left=0, right=0, counter=0;
	for (i=0; i<inputstring.length; i++) {
		if (inputstring.charAt(i)=="(") {
			left+=1;
		}
		if (inputstring.charAt(i)==")") {
			right+=1;
		}
	}
	if (!(left==right)) {
		callError("Mismatched parenthesis.");
		return false;
	}
	for (j=0; j<inputstring.length; j++) {
		if (inputstring.charAt(j)=="(") {
			matchpar=1;
			counter=0;

			while (matchpar>0 && counter<inputstring.length) {
				counter+=1;
				if (inputstring.charAt(j+counter)=="(") {
					matchpar+=1;
				}
				if (inputstring.charAt(j+counter)==")") {
					matchpar+=-1;
				}
			}
			if (matchpar>0) {
				j+=1;
				callError("Mismatched parenthesis at position number " + j);
				return false;

			}
		}
	}
	for (j=0; j<inputstring.length; j++) {
		if (inputstring.charAt(j)==")") {
			matchpar=1;
			counter=0;

			while (matchpar>0 && counter<inputstring.length) {
				counter+=1;
				if (inputstring.charAt(j-counter)==")") {
					matchpar+=1;
				}
				if (inputstring.charAt(j-counter)=="(") {
					matchpar+=-1;
				}
			}
			if (matchpar>0) {
				j+=1;
				callError("Mismatched parenthesis at position number " + j);
				return false;

			}
		}
	}
	return true;
};



function makeStack(inputstring)
{
	var mstring, minilen, mpos, mstack, checkStack, checkExpr, counter, checkResult;
	mstring=inputstring;
	mpos=0;
	mstack=[];
	checkStack=[];
	minilen=mstring.length;
	checkExpr=[];
	checkResult=[];
	counter=0;

	while (mpos < minilen && counter<minilen*2) {
		if (nextToken(mstring,mpos)) {
			if (tokentype=="f1") {
				mstack.push(this[tokenvalue]);
				mstack.push("f1");
				checkStack.push(this["sin"]);
				checkStack.push("f1");
			}
			if (tokentype=="f2") {
				mstack.push(this[tokenvalue]);
				mstack.push("f2");
				checkStack.push(this["plus"]);
				checkStack.push("f2");
			}
			if (tokentype=="v") {
				mstack.push(tokenvalue);
				mstack.push("v");
				checkStack.push("x");
				checkStack.push("v");
			}
			if (tokentype=="n") {
				mstack.push(Number(tokenvalue));
				mstack.push("n");
				checkStack.push(Number(tokenvalue));
				checkStack.push("n");
			}
		} else {
			callError("Unknown characters.");
			return [];
		}
		mpos+=tokenlength;
		counter+=1;
	}


	mstack.reverse();
	checkExpr=checkStack.reverse();
	checkEval(checkExpr);
	if (iserror==1) {
		return [];
	}
	return mstack;
};



function callError(mess)
{
	errorMes="Syntax error. " + mess;
	iserror=1;
};



function checkEval(compiledExpression )
{
	var entrytype="";
	var operands=[];
	var arg1, arg2;
	for (var i = 0; i < compiledExpression.length; i++) {
		entrytype = compiledExpression[i++];
		if (entrytype == "n") {
			operands.push(compiledExpression[i]);
		} else if ( entrytype == "v") {
			operands.push(1);
		} else if ( entrytype == "f1") {
			if (operands.length<1) {
				callError("Check number of arguments in your functions.");
				return;
			}
			operands.push(compiledExpression[i](operands.pop()));
		} else if ( entrytype == "f2") {
			if (operands.length<2) {
				callError("Check number of arguments in your functions.");
				return;
			}
			arg1=operands.pop();
			arg2=operands.pop();
			operands.push(compiledExpression[i](arg1,arg2));
		} else {
			callError("Can't evaluate.");
			return;
		}
	}
	if (!(operands.length==1)) {
		callError("");
		return;
	}
	if (isNaN(operands[0])) {
		callError("");
		return;
	}
};



function sin(a)
{  if (degreesMode) return Math.sin(Math.PI*a/180);
	else             return Math.sin(a);
};


function cos(a)
{   if (degreesMode) return Math.cos(Math.PI*a/180);
	else             return Math.cos(a);
};


function tan(a)
{   if (degreesMode)
	   { if((a-90)%180 == 0)  // for angles 90, 270 etc...
			return NaN;
		 else
			return Math.tan(Math.PI*a/180);
	   }
	else
	   { return Math.tan(a);
	   }
};


function asin(a)
{   if(degreesMode) return Math.asin(a)*180/Math.PI;
	else            return Math.asin(a);
};

function acos(a)
{   if(degreesMode) return Math.acos(a)*180/Math.PI;
	else            return Math.acos(a);
};


function atan(a)
{   if(degreesMode) return Math.atan(a)*180/Math.PI;
	else            return Math.atan(a);
};


function ln(a)
{ return Math.log(a);
};

function log(a)
{ return Math.log(a)/Math.log(10);
};

function sqrt(a)
{ return Math.sqrt(a);
};


function exp(a)
{ return Math.exp(a);
};

function abs(a)
{ return Math.abs(a);
};


 function floor(a)
{ return Math.floor(a);
};



function ceil(a)
{ return Math.ceil(a);
};

 function round(a)
{ return Math.round(a);
};


function max(a,b)
{ return Math.max(a,b);
};


function min(a,b)
{ return Math.min(a,b);
};


function plus(a,b)
{ return a + b;
};




function minus(a,b)
{ return a - b;
};



function mul(a,b)
{ return a * b;
};


function div(a,b)
{ return a / b;
};



function pow(a, b)
{   if (a<0 && b==Math.floor(b)) {
		if ((b % 2)==0) {
			return Math.pow(- a,b);
		} else {
			return - Math.pow(- a,b);
		}

	}
	if (a==0 && b>0) {
		return 0;
	}
	if (isNaN(a) && b==0) {
		return NaN;
	}
	return Math.pow(a,b);
};




function doEval(compiledExpression ,aVarVals )
{
	var entrytype="";
	var operands =[];
	var i;
	var j;
	var arg0;
	var arg1;
	var arg2;

	if (aVarVals.length!=aVarNames.length) {
		return NaN;
	}
	for (j = 0; j < aVarVals.length; j++) {
		if ((typeof aVarVals[j])!="number") {
			return NaN;
		}
	}

	for (i = 0; i < compiledExpression.length; i++) {
		entrytype = compiledExpression[i++];

		if (entrytype == "n") {
			operands.push(compiledExpression[i]);

		} else if ( entrytype == "v") {
			if (compiledExpression[i]=="e") {
				operands.push(Math.E);
			} else if (compiledExpression[i]=="pi") {
				operands.push(Math.PI);
			} else {
				for (j=0; j<aVarNames.length; j++) {
					if (compiledExpression[i]==aVarNames[j]) {
						operands.push(aVarVals[j]);
					}
				}
			}

		} else if ( entrytype == "f1") {
			arg0=operands.pop();
			operands.push(compiledExpression[i](arg0));

		} else if (entrytype == "f2") {
			arg1=operands.pop();
			arg2=operands.pop();
			operands.push(compiledExpression[i](arg1,arg2));

		} else {
			return NaN;
		}
	}
	return operands[0];
};












function CalcStore()  // constructor
{
    this.type = "CalcStore";
	this.stack = new Array();
 	this.stack.push(newEntry());
	this.resultStack = new Array();

    this.memory = new Array();   //an array holding the  memory locations 'a', 'b', 'c', 'd'.
    this.memory['a'] = NaN;
    this.memory['b'] = NaN;
    this.memory['c'] = NaN;
    this.memory['d'] = NaN;

		function newEntry()  //local
		// Makes a new entry ready to be pushed on the stack.
		{
		  var entry = new Object();
		  entry.expr="";
		  entry.lengths = new Array();
		  return entry;
		};


	this.append = function(s)
	// Appends the string s to the expression string on the top of the stack
	{
	  this.stack[this.stack.length-1].expr += s;
	  this.stack[this.stack.length-1].lengths.push(s.length);
	};


	this.chop = function()
	// Opposite of append.  Removes the last thing appended.  If entry empty = nop.
	{ var tos = this.stack.pop();
	  if(tos.expr.length > 0)
		  with(tos)
			{ var itemLen = lengths.pop();
			  expr = expr.substring(0, expr.length-itemLen);
			}
	  this.stack.push(tos);
	};


	this.startNewEntry = function()
	//Signals the end of an entry line.
	{ console.log("startNewEntry");
	  this.stack.push(newEntry());  
	};


	this.undo = function()
	//removes the top-most non-empty expression on the top of the stack
	{ 

	   //pop one off
	   var tos = this.stack.pop();

	  //if it was empty then its the next one we need to delete
	  if(tos.lengths.length==0)
	     { this.stack.pop(); //chained undo's
		   this.resultStack.pop();
		 }

	  //make a new empty one
	  this.stack.push(newEntry());
	};



	this.clear = function()
	{ this.stack = new Array();
 	  this.stack.push(newEntry());

      this.memory['a'] = NaN;
      this.memory['b'] = NaN;
      this.memory['c'] = NaN;
      this.memory['d'] = NaN;

      memA.setHoverText("Not set", false);
      memB.setHoverText("Not set", false);
      memC.setHoverText("Not set", false);
      memD.setHoverText("Not set", false);
	};


	this.saveResult = function(res)
	{ this.resultStack.push(res);
	};



	this.ans = function()
	//Returns the most recent answer value in full precision
	{ if(this.resultStack.length==0)
	     return NaN;
	  else
	     return this.resultStack[this.resultStack.length-1]
	};


	this.asHTML = function(scaled)
	// Returns the expr stack in HTML without popping it
	// The html only gets displayed  after this, so it doesn't matter.
    // If scaled=true, then the fontsize is scaled.
    //Scaled is used in the screen dipslay, but false for printing
	{ var str;
	  var html = ""; 

	  for (var i=0; i<this.stack.length; i++)  //for each line
	  	{ str = this.stack[i].expr;
          str = this.doReplacements(str);
		  if(scaled)
             html += "<div class='line'>"+ str +"</div>";
          else
             html += "<div style='font-size:16px'>"+ str +"</div>";
		} 
	  return html;
	};


	this.asPrintable = function()
	// Returns an array of printable pages, each page is a string
	{ var pageSet = new Array();
	  var linesPerPage = 50;
	  var lineCount=0;
	  var line;
	  var page = "";
	  for (var i=0; i<this.stack.length; i++)   //for each calculator line
	  	{
		  line = this.stack[i].expr;
          line = this.doReplacements(line);
		  page += line + "\n";             //add line to page
		  lineCount++;
		  if (lineCount==linesPerPage)    //page full
		  	{ pageSet.push(this.makePage(page));
			  page = "";
			  lineCount = 0;
			}
		}

	  // flush buffer if anything in it
	  if(page.length > 0 )
	     pageSet.push(this.makePage(page));

	  return pageSet;
	};


	this.makePage = function (s)
	// turns a string s into a printable page and returns it
	{ 	var topMargin = "\n\n\n\n";

	    var html =
	    "<span class='all'>"+
		"<textformat rightmargin='4'>";

        html += topMargin + s;

	    html +=
		"</textformat>"+
		"</span>";

	    return html;
	};



	this.doReplacements = function(s)
	// Returns a string with modifications to make it legible and replaces escape codes:
	//   ~a = start of answer (usually in a diff color)
	//   ~~ = end of above item.
	// It also does some character replacement for legibility eg long minus.
	{     var str = s;
	      str = str.replace(/~a/g,  "<span class='ans'>"); //replace all  ~a
		  str = str.replace(/~~/g,  "</span>");            //replace all  ~~
          str = str.replace(/-/g,   "\u2013");             //replace all  minus with long version
		  str = str.replace(/NaN/g, "Error");              //punters will never understand NaN (not a number)
          str = str.replace(/\*/g,  "\u00D7");             //replace all  Asterisk with times
          return str;
	};



	this.getParsableExpr = function ()
	// Returns the expression on the top of the stack with format hints removed
	// and fixes needed before compilation
	{
	   var str = this.peek().expr;
       str = str.replace(/~a/g, "");  //remove all occrrences of ~a
	   str = str.replace(/~~/g, "");  //remove all occurences of ~~

	   //see if a function name is preceded by a number. If so, insert a multiply (*).
	   var pattern;
       for(var i=0; i<f1Array.length; i++)
	      { var name = f1Array[i];
            pattern = new RegExp ("\\d" + name,"g");    //digit followed by a fn name, g=all occurences
            str = str.replace(pattern,this.insertAsterisk);  //see next function
		  }
	   return str;
	};


	this.insertAsterisk = function()
	//called by getParsableExpr()
	// returns a string with an asterisk inserted at index 1 (second byte)
	// arg[0] is the substr that matched the regexp
	{ var subStr = arguments[0];
	  var newStr = subStr.charAt(0) + "*" + subStr.slice(1);
      return newStr;
    };


	this.getExprStr = function ()
	//returns the expression string off the tos without modifying it
	{ return this.peek().expr;
	};


	this.peek  = function()
	// Returns the object on top of the stack without popping it
	{ return this.stack[this.stack.length-1];
	};



	this.replace = function(str)
	// Replaces the expression string on tos with str.
	{ this.stack[this.stack.length-1].expr = str;
	};


	this.setMem = function(mem, memButn)
	//Sets the memory 'mem' to the current result
	{ var currentAns = this.ans();
      if( !isNaN(currentAns) )
			{ this.memory[mem.toLowerCase()] = currentAns;
              memButn.setHoverText(currentAns, true);
            }
	};


} //class