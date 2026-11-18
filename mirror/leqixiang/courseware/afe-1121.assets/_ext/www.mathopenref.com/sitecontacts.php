 
<!DOCTYPE HTML >
<html>
<head>
<title>Contact form - Math Open Reference</title>
<META http-equiv="content-type" content="text/html; charset=UTF-8">
<META NAME="Keywords" CONTENT="contact">
<META NAME="Description" CONTENT="Contact form - Math Open Reference">
<link href="common/css2.css" type="text/css" rel="stylesheet">

<style>
#emailform                { 
	width:100%; 
	max-width:450px; 
	font-variant:small-caps; 
	padding:14px; 
	border:3px solid #bbb; 
	margin:20px auto; 
	border-radius:8px
	}

#emailform input,textarea { 
	display:block; 
	padding: 5px; 
	margin-bottom:20px; 
	width:100%; 
	padding-left:5px
	}

#emailform textarea       {
	height:80px; 
	font-family:sans-serif; 
	}

#sendButton    { 
display: block;
	font-size:120%; 
	font-variant:inherit; 
	cursor:pointer;
    margin: auto;
}

.success {
	text-align:center;
	color:green;
	margin-top:20px;
}

.error {
	text-align:center;
	color:red;
	margin-top:20px;
}

</style>

<script>
	function hit()
	{  document.getElementById("auth").value="hit";
	}
</script>

<!-- @@include adunits/neworheaderscript.txt  -->

<script type="text/javascript" src="//cdn.thisiswaldo.com/static/js/9075.js"></script>

</head>




<body>

<!-- @@include navbar.txt  -->
<!-- navbar include starts  -->

<style>

#nav1  {
	position:fixed;
	top:0; 
	left:1%;
	background: #6789ab;
	height: 36px;
	width: 98%;
	max-width: 728px;
	z-index:9000;
}

	#nav1 #logo {
		float:left;
		letter-spacing:1px;
		font-size:20px;
		font-weight:bold;
		color:white;
		margin:	8px 0 0	20px;
		cursor:pointer;
	}


#nav2	{
	position:fixed;
	top:36px;
	left:1%;
	background: #666;
	height: 42px;
	max-width: 728px;
	width:98%;
	padding:9px 0 0 20px;
	z-index:9000
}



	#nav2 #srch {
		width:240px;
		height: 22px;
		border: 2px solid #a98;
		padding-left:5px;
		font-size:16px;
		font-family:sans-serif;
		border-radius:	6px 0 0	6px
	}

	#nav2 #srch:focus {
		outline: none;
	}

	#nav2 #srchIcon	{
		float:left;
		width:30px;
		position:relative;
		height:22px;
		background:#a98;
		border-radius: 0 6px 6px 0;
		cursor:pointer;
	}

	#nav2 .search.icon {
		color: #000;
		position: absolute;
		top: 3px;
		left:5px;
		width: 14px;
		height: 14px;
		border: solid 1px white;
		border-radius: 100%;
		-webkit-transform: rotate(-45deg);
		transform: rotate(-45deg);
	}

	#nav2 .search.icon:before {
		content: '';
		position: absolute;
		top: 11px;
		left: 4px;
		height: 10px;
		width: 2px;
		background-color: white;
		}



#nav3	{
	position:fixed;
	top:78px;
	left:1%;
	background:#a98;
	height:36px;
	width:98%;
	max-width: 728px;
	padding-top:4px;
	z-index:9000
}

	#nav3 .navLink	{
		color:white;
		margin:4px 14px 0 12px ;
		float:left;
		cursor:pointer
	}


@media print {
		body {
		margin-top: 50px
		}

		#nav1,#nav2,#nav3 {
		display:none
		}
}

</style>


<div id="nav1">
	  <a id="logo" title="Home" href="index.html" >Math Open Reference</a>
</div>

<div id="nav2">
	<form id="searchForm" action="search.php" method="post" onsubmit="goSearch();">
	   <input id="srch" name="srch" style="float:left" >
	   <input type="hidden" id="dbug" name="dbug" value="normal">

	   <div id="srchIcon" onclick="goSearch()">
	     <div class="search icon" title="Search"></div>
	   </div>

	</form>
</div>


<div id="nav3">
	<a class="navLink" href='index.html'>Home</a>
	<a class="navLink" href='sitecontacts.php'>Contact</a>
	<a class="navLink" href='siteabout.html'>About</a>
	<a class="navLink" href='indexpagea.html'>Subject Index</a>
</div>


<!-- include ends -->



<!-- @@include leftcol.txt  -->
<style>




.leftSideBar  {      
        display:none;
	position:fixed; 
	top: 50px; 
	left:5px; 
	width:160px; 
	height:200px;
	border:1px solid pink;
}

/*desktop devices only*/
@media only screen and (min-device-width: 480px)	
  {	
     body {
	margin-left:220px;
     }

     .leftSideBar  { 
     	display:block;
     }

     #nav1, #nav2, #nav3 {
     left: 220px;
     width:600px;
     }

  }

</style>


<div  class="leftSideBar" >
	<!-- @@include adunits/newor160x600.txt  -->
<div style="width:160px; height:600px;  border:1px solid #aaa; background:#f6f6f6;">
	<!-- 160x600 -->
	<div id="waldo-tag-9354"></div>
</div>

</div>




<h1>Contact the author</h1>

	I am always delighted to hear from users.  If you would like a reply, please be sure to include an email address.   
	<b>Note:</b>  This message is converted to an email and is not stored on the server.  

 
	<form id="emailform" action="" method="post" onmousedown = "hit()" onkeyup="hit()">

		Your name (optional)
		<input type="text" name="yourName"value="" >

		Your email address (optional)
		<input type="text" name="yourEmail" value="" >

		Message
		<textarea  name="body"></textarea>

		<input type="hidden" name="referer" value="">
		<input type="hidden" name="auth" id="auth">

		<button id="sendButton" type="submit" name="submit">Submit</button>	

							<p class="error"></p>
				
	</form>



<!-- @@include smallprint.txt  -->
<!-- include starts  -->
<form id="feedback" action="/site/contacts.php" method="post">
	<input class="fbInput1" type="hidden" name="refpage"  id="refpage" value=""  />
</form>



<div class="legal" >
  (C) 2011 Copyright Math Open Reference. 
  <br>All rights reserved
</div>

<!-- include ends -->





<!-- @@include rightcol.txt  -->

<style>

.rightCol  {            /* overrides css2.css */
	position:fixed; 
	top: 20px; 
	left:875px; 
	width:300px; 
}

</style>

<div  class="rightCol" >

	<!-- @@include adunits/newor300x250-4.txt  -->
<div style="width:300px; height:250px; margin: 20px auto; border:1px solid #bbb; background:#efefef;">
	<!-- 300x250 -->
	<div id="waldo-tag-9180"></div>
</div>


	<!-- @  @include adunits/newor300x250-5.txt  -->

	<!-- @@include adunits/newor-video.txt  -->
<!-- place in-content VIDEO-->

<div style="width:300px; height:250px; margin: 20px auto; ">

	<div id='waldo-tag-9325'>
	 <script>
	   googletag.cmd.push(function() { googletag.display('waldo-tag-9325'); });
	 </script>
	</div>

</div>




</div>






<!-- @@include hitcounter.txt  -->
<script>
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-88697705-1', 'auto');
  ga('send', 'pageview');

</script>



<!-- @@include adunits/neworstickyfooter.txt  -->
<!-- 728x90/320x50 sticky footer -->

<style>

#neworFooter {
	display:none; /* we turn it back on selectively*/
}

@media screen and (max-device-width: 768px)  /* show if mobile, or              
              (min-height: 750px      )         any device if window tall enough */
  { #neworFooter {display:block;}
  }

</style>

 <div id="neworFooter">
    <div id="waldo-tag-9108"></div>
</div>

</body>
</html>

