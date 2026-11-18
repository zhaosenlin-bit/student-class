
/*  Navigation Bar Script ©2001 Russell W. Cottrell, M.D.  russellcottrell.com/md  */

var navs = [
	[1, "index.php", "home", " | "],
	[1.5, "gallery.htm", "gallery", "<br>"],

	[2.621, "LinuxWorkflow.htm", "Linux workflow", " | "],
	[2.623, "LittleArgyllGUI.php", "LittleArgyllGUI", " | "],
	[2.622, "ArgyllColorPatches.htm", "Argyll color patches",  "<br>"],

	[2.61, "matrixCalculator.htm", "matrix calculator", " | "],
	[2.501, "gamutPlotter.htm", "gamut plotter", " | "],
	[2.502, "visualGamut.htm", "visual gamut boundary", " | "],
	[2.504, "xyYCrossSection.htm", "xyY cross-section", " | "],
	[2.503, "LabCrossSection.htm", "Lab cross-section", "<br>"],

	[2.505, "ccCalculator.htm", "ColorChecker Calculator", " | "],
	[2.503, "optimization/index.html", "i1Profiler .cxf optimization files", "<br>"],

	[2, "centering.htm", "optical centering", " | "],
	[2.1, "colorSorter.htm", "color sorter", " | "],
	[2.19, "HSL.htm", "HSL converter", " | "],
	[2.2, "LCh.htm", "LCh navigator", "<br>"],

	[2.624, "BarytaComparison.htm", "baryta paper comparison", " | "],
	[2.62, "colorTransformer2.htm", "Color Transformer 2", " | "],
	[2.6, "RussellRGB.htm", "Russell RGB", " | "],
	[3, "technical.htm", "darkroom information", "<br>"],

	[4, "bibliography.htm", "bibliography and links", " | "],
	[5, "halfdome.htm", "Half Dome:&nbsp; The Motion Picture", " | "],
	[6, "/.contact/contact.php?href=photo", "contact", "<br><br>"],

	[2.629, "../RCFilters/index.html", "<span style='font-size: 130%'>Photoshop plugins</span>", ""],

	[7, "", "", ""]
];

function navbar(page) {
	for (i=0; i<navs.length; i++) {
		if (page == navs[i][0]) {
      page = i;
      break; } }

	var bar = '<div align="center"; style="font-size: 90%">';

	for (j=0; j<page; j++)
    bar = bar + '<span style="white-space: nowrap"><a href="' + navs[j][1] + '" target="_top">' + navs[j][2] + '</a>' + navs[j][3] + '</span> ';

	bar = bar + '<span style="white-space: nowrap"><b>' + navs[page][2] + '</b>' + navs[page][3] + '</span> ';

	for (k=page/1+1; k<navs.length; k++)
    bar = bar + '<span style="white-space: nowrap"><a href="' + navs[k][1] + '" target="_top">' + navs[k][2] + '</a>' + navs[k][3] + '</span>';

	bar = bar + '<br><br><span style="font-size: 130%">' +
		'<a href="BTDZS/"' +
		' target="_top">Beyond the Digital Zone System</a></span>' +

    '<br><br><span style="font-size: 130%">' +
		'<a href="PhotoLine/"' +
		' target="_top">An Introduction to Photo Editing with PhotoLine</a>' +

    '</div>';

	document.currentScript.insertAdjacentHTML("afterend", bar);
}

/*
<script language="JavaScript" src="navs.js"></script>

<script language="JavaScript">
  navbar(4);
</script>

<noscript><p class="small" align="right"><b><i><a href="index.php" target="_top">back</a></i></b></p></noscript>

*/

