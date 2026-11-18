



//
//  Used by those applets that use the SliderControl and wish to allow thr user to set the range limits
//
//


function SliderRangeDlg()
{  //build the dialog html in the host page attached to applet div

	var dlg = document.createElement('div');
	applet.appendChild(dlg);
	dlg.id = "rangedlg";
	dlg.className = "rangeDlg";

    dlg.innerHTML = 
     "<style>"
	+".rangeDlg          {position:absolute; left:50px; top:50px; text-align:center; visibility:hidden; "
	+"                    background:#ece9e8; width: 300px; z-index:1000; height:185px; border:2px outset gray}"
	+".rangeDlg #dlgHead {color:white; text-align:center; background:#7b97e0; font-family:sans-serif; font-size:14px ; height:21px;}"
	+".rangeDlg table    {margin: 20px auto 15px auto; }"
	+".rangeDlg td       {font-size:16px }"
	+".rangeDlg #errmsg  {color:red; text-align:center;height:24px}"
	+".rangeDlg input[type=\"button\"]  {margin: 0 20px 0 20px}"
	+"</style>"


	+"<div id='dlgHead'></div>"

	+"<table border=0 align=center cellspacing=4>"
	+"<tr><td>Upper limit</td><td><INPUT id='upper'></td></tr>"
	+"<tr><td>Lower limit</td><td><INPUT id='lower' ></td></tr>"
	+"<tr><td id='errmsg' colspan='2'></td></tr>"
	+"</table>"

	+"<INPUT  TYPE='button' value='OK'     onclick='dlgok()'  id='ok'>"
	+"<INPUT  TYPE='button' value='Cancel' onclick='closeDlg()'>"




    this.show = function(slider)
     { rangeSlider = slider;
       document.getElementById('rangedlg').style.visibility = "visible";
       document.getElementById('errmsg').innerHTML ="";

       //insert current values into fields
       document.getElementById('dlgHead').innerHTML = "Set range for slider "+slider.labl.text;
       document.getElementById('upper').value = slider.topValue; 
       document.getElementById('lower').value = slider.bottomValue;
     };

}  //constructor end






function closeDlg()
{ document.getElementById('rangedlg').style.visibility = "hidden";
  document.getElementById('errmsg').innerHTML ="";
}


function dlgok()
{ var upperLim = parseInt( document.getElementById('upper').value ) ;  
  var lowerLim = parseInt( document.getElementById('lower').value ) ; 
  document.getElementById('errmsg').innerHTML ="";

  if(!goodInput(upperLim)) return;
  if(!goodInput(lowerLim)) return;

  if(upperLim < lowerLim)
	{ document.getElementById('errmsg').innerHTML = "Lower limit must be less than upper";
      return;
	}

  if(upperLim < lowerLim)
	{ document.getElementById('errmsg').innerHTML = "Lower limit must be less than upper";
      return;
	}

  if( !inRange(upperLim) || !inRange(lowerLim) )
	{ document.getElementById('errmsg').innerHTML = "Limits must be between +99 and -99";
      return;
	}


  //inputs all look good, stuff them back into the slider.  Show() saved the pointer to the slider.
  rangeSlider.setHigh(upperLim);
  rangeSlider.setLow(lowerLim);

  //make the slider thumb, value  and readout adjust to the new limits
  rangeSlider.setValue(rangeSlider.getValue());
  update();

  closeDlg();

}


function goodInput(val)
{ 
  if( isNaN(val) )
    { document.getElementById('errmsg').innerHTML = "Both limits must be valid numbers";
      return false;
    }
  else
    return true;
}


function inRange(v)
{ return (v<=99 && v>-99);
}
