/*
	Contour Generator
	
	A macro script for generating contour lines on all shapes on exposed cels.
	The generated contours are already merged so we can edit them with Pencil Editor tool quickly.
	Compatible with Harmony 17 and up.	
	
		v4.00 - Now uses "Drawing.createLayer()" to create contours instead of relying on "Action.perform()".
		v4.01 - Main dialog widget acts as a child of Harmony application.
		v4.02 - "drawing.elementMode" attribute is changed to "drawing.ELEMENT_MODE" to accomodate Harmony 22 update.
			   
	
	Installation:
	
	1) Download and Unarchive the zip file.
	2) Locate to your user scripts folder (a hidden folder):
	   https://docs.toonboom.com/help/harmony-17/premium/scripting/import-script.html	
	   
	3) There is a folder named "src" inside the zip file. Copy all its contents directly to the folder above.
	4) In Harmony, add ANM_Contour_Generator function to any toolbar.

	   	  
	Direction:

	1) Run ANM_Contour_Generator.
	2) Select a drawing node in Camera, Timeline or Node view.
	3) Set source and destination art layer. Set options.
	4) To generate contour lines on specific range of frames, select the frames in the timeline then click "On Selected Frames".
	5) To generate contour lines on all exposed frames in the timeline, click "On All Frames".

		
	Author:

	Yu Ueda (raindropmoment.com)
	
	Thanks user ChrisF for sharing the script to modify pencil line styles :)	
*/


var scriptVer = "4.02";


function ANM_Contour_Generator()
{
	var pf = new private_functions();
	
	var softwareVer = pf.getSoftwareVer();		
	if (softwareVer < 17)
	{
		MessageBox.information("This script only supports Harmony 17 and higher.");
		return;
	}
	var sNode = selection.selectedNodes(0);	
	
	// load UI
	this.ui = pf.createUI();
	
	// load preference, set ui state
	this.showUI = function()
	{
		var pref = pf.loadPref();
		this.ui.show();
							
		this.srcLayer = pref.srcLayer;
		this.dstLayer = pref.dstLayer;
		this.merge = pref.merge;
		this.joinStyle = pref.joinStyle;
		this.thickness = pref.thickness;
		this.ui.move(pref.x, pref.y);
		this.ui.joinStyleCombo.setCurrentIndex(this.joinStyle);		
		this.ui.thicknessSpin.setValue(this.thickness);	
		this.ui.mergeRB.checked = !!(this.merge);
		this.ui.separateRB.checked = !this.ui.mergeRB.checked;
		this.ui.srcOverlayRB.checked = (this.srcLayer === 3);
		this.ui.srcLineRB.checked = (this.srcLayer === 2);
		this.ui.srcColorRB.checked = (this.srcLayer === 1);
		this.ui.srcUnderlayRB.checked = (this.srcLayer === 0);
		this.ui.dstOverlayRB.checked = (this.dstLayer === 3);
		this.ui.dstLineRB.checked = (this.dstLayer === 2);
		this.ui.dstColorRB.checked = (this.dstLayer === 1);
		this.ui.dstUnderlayRB.checked = (this.dstLayer === 0);
		
		this.refreshSelection();	
	}
	
	this.refreshSelection = function()
	{
		sNode = selection.selectedNodes(0);
		if (selection.numberOfNodesSelected === 0 || node.type(sNode) !== "READ")
		{
			this.ui.toolTipLabel.setStyleSheet("QLabel{color: red}");
			this.ui.toolTipLabel.text = "No Drawing Node selected";	
			this.ui.selectedFrameButton.enabled = false;
			this.ui.applyAllButton.enabled = false;
		}
		else
		{			
			this.ui.toolTipLabel.setStyleSheet("");			
			this.ui.toolTipLabel.text = "Node: " + sNode;			
			this.ui.selectedFrameButton.enabled = true;
			this.ui.applyAllButton.enabled = true;			
		}
	}
	this.showUI();		

	this.mergeRBToggled = function(boolVal)
	{
		this.merge = Number(boolVal);
	}
	this.separateRBToggled = function(boolVal)
	{
		this.merge = Number(!boolVal);
	}	
	this.srcOverlayRBToggled = function(boolVal)
	{
		if (boolVal)
			this.srcLayer = 3;
	}	
	this.srcLineRBToggled = function(boolVal)
	{
		if (boolVal)
			this.srcLayer = 2;
	}
	this.srcColorRBToggled = function(boolVal)
	{
		if (boolVal)
			this.srcLayer = 1;
	}
	this.srcUnderlayRBToggled = function(boolVal)
	{
		if (boolVal)
			this.srcLayer = 0;
	}
	this.dstOverlayRBToggled = function(boolVal)
	{
		if (boolVal)
			this.dstLayer = 3;
	}	
	this.dstLineRBToggled = function(boolVal)
	{
		if (boolVal)
			this.dstLayer = 2;
	}
	this.dstColorRBToggled = function(boolVal)
	{
		if (boolVal)
			this.dstLayer = 1;
	}
	this.dstUnderlayRBToggled = function(boolVal)
	{
		if (boolVal)
			this.dstLayer = 0;
	}
	this.joinStyleComboIndexChanged = function(idx)
	{
		this.joinStyle = idx;			
	}	
	this.thicknessSpinValueChanged = function(value)
	{
		this.thickness = value;			
	}
	this.selectedFrameButtonReleased = function()
	{
		this.mode = "selectedFrames";
		pf.callFunctionOnFrames(sNode, this);
		this.refreshSelection();	  
	}
	this.applyAllButtonReleased = function()
	{
		this.mode = "applyAll";		
		pf.callFunctionOnFrames(sNode, this);		
		this.refreshSelection();
	}
	var _this = this;	
	this.ui.closeEvent = function()    // when title bar "x" is clicked
	{			
		pf.savePref(_this);
		scn.disconnectAll();	
		_this.ui.close();	
	}
	this.ui.changeEvent = function()
	{
		if (_this.ui.isActiveWindow)
			_this.refreshSelection();
	}		
				
	var scn = new SceneChangeNotifier(this.ui);
	scn.selectionChanged.connect(this, this.refreshSelection);

	this.ui.mergeRB.toggled.connect(this, this.mergeRBToggled);
	this.ui.separateRB.toggled.connect(this, this.separateRBToggled);	
	this.ui.srcOverlayRB.toggled.connect(this, this.srcOverlayRBToggled);	
	this.ui.srcLineRB.toggled.connect(this, this.srcLineRBToggled);	
	this.ui.srcColorRB.toggled.connect(this, this.srcColorRBToggled);	
	this.ui.srcUnderlayRB.toggled.connect(this, this.srcUnderlayRBToggled);
	this.ui.dstOverlayRB.toggled.connect(this, this.dstOverlayRBToggled);	
	this.ui.dstLineRB.toggled.connect(this, this.dstLineRBToggled);	
	this.ui.dstColorRB.toggled.connect(this, this.dstColorRBToggled);	
	this.ui.dstUnderlayRB.toggled.connect(this, this.dstUnderlayRBToggled);
	this.ui.joinStyleCombo['currentIndexChanged(int)'].connect(this, this.joinStyleComboIndexChanged);
	this.ui.thicknessSpin['valueChanged(double)'].connect(this, this.thicknessSpinValueChanged);	
	this.ui.selectedFrameButton.released.connect(this, this.selectedFrameButtonReleased);	
	this.ui.applyAllButton.released.connect(this, this.applyAllButtonReleased);	
}


function private_functions()
{
	this.callFunctionOnFrames = function(sNode, pref)
	{
		// save the original selection tool state and then set the necessary state
		var softwareVer = this.getSoftwareVer();
		var OGSettings = this.captureOGSettingsThenApplyPresets(softwareVer);
		var OGFrame = frame.current();	

		var startFrame = Timeline.firstFrameSel;		
		var endFrame = startFrame + Timeline.numFrameSel -1;
		if (pref.mode === "applyAll")
		{	
			startFrame = 1;
			endFrame = frame.numberOf();
		}
		pref.color = PaletteManager.getCurrentColorId();
		var useTiming = node.getAttr(sNode, 1, "drawing.ELEMENT_MODE").boolValue();
		var drawCol = node.linkedColumn(sNode, useTiming ? "drawing.element" : "drawing.customName.timing");  		
		var celList = column.getDrawingTimings(drawCol);	
		MessageLog.trace(celList);	
		if (pref.joinStyle !== 0)
		{			
			switch (pref.dstLayer)
			{
				case 3 : DrawingTools.setCurrentArt(8); break;
				case 2 : DrawingTools.setCurrentArt(4); break;
				case 1 : DrawingTools.setCurrentArt(2); break;
				case 0 : DrawingTools.setCurrentArt(1);
			}
			Action.perform("onActionChooseSelectTool()", "cameraView, drawingView");			
			Action.perform("deselectAll()", "cameraView, drawingView");
		}		
		
		
		scene.beginUndoRedoAccum("Contour Generator");
		
	
		var checkedCels = [];
		for (var fr = startFrame; fr <= endFrame; fr++)
		{
			var curCel = column.getEntry (drawCol, 1, fr);
			if (celList.indexOf(curCel) !== -1 && checkedCels.indexOf(curCel) === -1)
			{	
				this.generateContour(sNode, pref, fr);
				checkedCels.push(curCel);
			}
			else if (checkedCels.length === celList.length)
				break;
		}

		
		scene.endUndoRedoAccum();		

		// set selection tool states back to original
		this.restoreOGSettings(softwareVer, OGSettings);
		frame.setCurrent(OGFrame);
		DrawingTools.setCurrentDrawingFromNodeName(sNode, OGFrame);
	};	


	this.generateContour = function(sNode, pref, fr)
	{
		var layerData = {drawing: {node: sNode, frame: fr}, art: pref.srcLayer};
		var fills = Drawing.query.getStrokes(layerData);
		if (!fills || fills.layers.length < 1)
			return;

		// Look for inner paths between multiple layers.
		// If there are duplicate paths over different layers, They are instances of inner strokes.
		// Convert each path on all layers into a string. We then look for matches.
		var pathStrings = [], innerPaths = [], exclStrokeIdx = [];
		for (var ly = 0; ly < fills.layers.length; ly++)
		{
			var lyrPathStrings = []
			var curLayer = fills.layers[ly];
			for (var st = 0; st < curLayer.strokes.length; st++)
				lyrPathStrings.push(JSON.stringify(curLayer.strokes[st].path));
			pathStrings.push(lyrPathStrings);
		}	
		for (var ps1 = 0; ps1 < pathStrings.length; ps1++)
			exclStrokeIdx.push([]);

		for (var ps1 = 0; ps1 < pathStrings.length; ps1++)
		{
			var lyrExclPtIdx = [];
			for (var ps2 = 1; ps2 < pathStrings.length; ps2++)
			{	
				if (ps1 === ps2)
					continue;
				var curLayer = pathStrings[ps1];
				for (var lyr1 = 0; lyr1 < curLayer.length; lyr1++)
				{
					var lyr2 = pathStrings[ps2].indexOf(curLayer[lyr1]);
					if (lyr2 !== -1)
					{
						innerPaths.push(fills.layers[ps1].strokes[lyr1].path);
						exclStrokeIdx[ps1].push(lyr1);					
						exclStrokeIdx[ps2].push(lyr2);
					}
				}
			}
		}


		var outerPaths = [];
		for (var ly = 0; ly < fills.layers.length; ly++)
		{
			var curLayer = fills.layers[ly];	
			var firstStrokeType = null;
			for (var st = 0; st < curLayer.strokes.length; st++)
			{
				if (exclStrokeIdx[ly].indexOf(st) !== -1)
					continue;			
				
				// Check if the selected path has a shader (hence its a part of fill).
				// If the selected path has both left and right shaders, it's an instance of inner strokes.
				// Skip paths without shaders (hence its a stroke).
				var curStroke = curLayer.strokes[st];				
				if ("shaderRight" in curStroke && "shaderLeft" in curStroke)
					innerPaths.push(curStroke.path);
				else if ("shaderRight" in curStroke || "shaderLeft" in curStroke)
				{
					if (firstStrokeType === null && "shaderRight" in curStroke)
						firstStrokeType = "shaderRight";
					else if (firstStrokeType === null && "shaderLeft" in curStroke)
						firstStrokeType = "shaderLeft";
						
					if (firstStrokeType in curStroke)
						outerPaths.push(curStroke.path);
					else
						outerPaths.push(curStroke.path.reverse());								
				}
			}		
		}

		var paths = this.mergeStrokes(outerPaths);	
		if (pref.merge === 0 /*false*/)
			paths.push.apply(paths, this.mergeStrokes(innerPaths));
				
		for (var pt = 0; pt < paths.length; pt++)		
			this.drawLine(sNode, fr, pref, paths[pt]);



		// select the new contours one by one then set them user selected join style
		if (pref.joinStyle !== 0)
		{
			DrawingTools.setCurrentDrawingFromNodeName(sNode, fr);
			Action.perform("selectAll()", "cameraView");
			this.setLineStyle(pref.joinStyle);
			Action.perform("deselectAll()", "cameraView");
		}
	};
	
	
	this.mergeStrokes = function(paths)
	{	
		function mergePaths(pathA, pathB)
		{
			pathA.pop();
			return pathA.concat(pathB);
		}	
	
		// create a complete list of first "onCurve" points.
		var firstPtStrings = [];		
		for (var pt0 = 0; pt0 < paths.length; pt0++)
			firstPtStrings.push(JSON.stringify(paths[pt0][0]));
			
		var mergedPaths = [];
		for (var pt = 0; pt < paths.length; pt++)
		{
			if (firstPtStrings[pt] === "used")
				continue;
				
			firstPtStrings.splice(pt, 1, "used");				
				
	
			// If path is periodic, just add it to mergedPaths.
			var lastPtIdx0 = paths[pt].length -1;			
			if (paths[pt][0].x === paths[pt][lastPtIdx0].x && paths[pt][0].y === paths[pt][lastPtIdx0].y)
			{
				mergedPaths.push(paths[pt]);
				continue;
			}

			// Keep looking for a path of which first point matches with the current path's last point.
			var mergedPath = paths[pt];
			var lastPtString = JSON.stringify(mergedPath[mergedPath.length -1]);
			while (firstPtStrings.indexOf(lastPtString) !== -1)
			{
				var idx = firstPtStrings.indexOf(lastPtString);
				firstPtStrings.splice(idx, 1, "used");				
				mergedPath = mergePaths(mergedPath, paths[idx]);
				lastPtString = JSON.stringify(mergedPath[mergedPath.length -1]);
			}
			mergedPaths.push(mergedPath);			
		}
		return mergedPaths;
	};	
	
		
	this.drawLine = function(argNode, fr, pref, path)
	{
		var layerDef = 
		{
			drawing : {node: argNode, frame: fr},
			art: pref.dstLayer,
			layers :
			[{
				strokes :
				[{
					stroke : true,
					pencilColorId: pref.color,
					thickness: {constant: pref.thickness},
					path: path
				}]
			}]
		};	 
		DrawingTools.createLayers(layerDef);
	};


	this.getOGArtLayer = function()
	{
		var overlayIcon = Action.validate("onActionOverlayArtSelected()", "artLayerResponder");
		var lineIcon = Action.validate("onActionLineArtSelected()", "artLayerResponder");
		var colorIcon = Action.validate("onActionColorArtSelected()", "artLayerResponder");
		var underlayIcon = Action.validate("onActionUnderlayArtSelected()", "artLayerResponder");
		var OGArtLayer = 4;
		if		(overlayIcon.checked)		OGArtLayer = 8;
		if		(colorIcon.checked)		OGArtLayer = 2;
		else if	(underlayIcon.checked)	OGArtLayer = 1;
		
		return OGArtLayer;
	};
	
	
	this.setLineStyle = function(joinStyle)
	{
		var windows = QApplication.allWidgets();
		for (var x=0;x <windows.length; x++)
		{
			var window = windows[x];
			if (window.objectName === "pencilShape")
			{
				if (window.parentWidget().objectName === "frameBrushParameters")
				{
					window.onChangeTipStart(2);
					switch (joinStyle)
					{
						case 0: window.onChangeJoin(1); break;
						case 1: window.onChangeJoin(2); break;			
						case 2: window.onChangeJoin(3); break;
					}
					break;
				}
			}
		}
	};


	this.getUniqueName = function(argName, mode, group /* for node only */)
	{
		var suffix = 0;
		var originalName = argName;
		
		if (mode === "element")
		{
			while (element.getNameById(argName))
			{
				suffix ++;
				argName = originalName + "_" + suffix;	
			}
		}
		else if (mode === "column")
		{
			while (column.getDisplayName(argName))
			{
				suffix ++;
				argName = originalName + "_" + suffix;	
			}
		}
		else  // mode === "node"
		{
			while (node.getName(group + "/" + argName))
			{
				suffix ++;
				argName = originalName + "_" + suffix;	
			}
		}		
		return argName;
	};


	this.createCel = function(elemId, colName, f)
	{
		var timing = column.generateTiming(colName, f, true); 			
		var success = Drawing.create(elemId, timing, false, false);
		if (success)
			column.setEntry (colName, 1, f, timing);
	};
	
	
	this.loadPref = function()	
	{	
		var pref = {};		
		var localPath = specialFolders.userScripts;	
		localPath += "/YU_Script_Prefs/ANM_Contour_Generator_Pref";
		var file = new File(localPath);
	
		try
		{
			if (file.exists)
			{
				file.open(1) // read only
				var sd = file.readLines();
				file.close();

				pref.srcLayer = parseInt(sd[0]);
				pref.dstLayer = parseInt(sd[1]);
				pref.merge = parseInt(sd[2]);
				pref.joinStyle = parseInt(sd[3]);				
				pref.thickness = parseFloat(sd[4]);
				pref.x = parseFloat(sd[5]);	
				pref.y = parseFloat(sd[6]);				
			}
		}
		catch(err){}			
		
		if (Object.keys(pref).length === 0)
		{	
			MessageLog.trace("Contour Generator: Preference file is not found. Loading default setting.");
			var preset = {};
			preset.srcLayer = 2;
			preset.dstLayer = 1;
			preset.merge = 1;
			preset.joinStyle = 1;			
			preset.thickness = 5;
			preset.x = 300;
			preset.y = 200;			
					
			pref = preset;
		}		
		return pref;
	};
	

	this.savePref = function(pref)
	{
		var localPath = specialFolders.userScripts + "/YU_Script_Prefs";
		var dir = new Dir;
		if (!dir.fileExists(localPath))
			dir.mkdir(localPath);		
		localPath += "/ANM_Contour_Generator_Pref";		
		var file = new File(localPath);
		
		try
		{	
			file.open(2); // write only
			file.writeLine(pref.srcLayer);
			file.writeLine(pref.dstLayer);
			file.writeLine(pref.merge);			
			file.writeLine(pref.joinStyle);			
			file.writeLine(pref.thickness);
			file.writeLine(pref.ui.x);			
			file.write(pref.ui.y);			
			file.close();
		}
		catch(err){}
	};


	this.getSoftwareVer = function()
	{
		var info = about.getVersionInfoStr();
		info = info.split(" ");
		return parseFloat(info[7]);
	};
	
	
	this.captureOGSettingsThenApplyPresets = function(softwareVer)
	{
		// capture current tool, Select tool settings and the art layer mode...
		var settings = this.captureSelectToolSettings(softwareVer);		
		settings.tool = this.captureCurrentTool(softwareVer);
		settings.artLayer = this.captureArtLayerSettings();		
		
		//...and then set the custom settings
		ToolProperties.setMarkeeMode(false);	
		ToolProperties.setSelectByColourMode(false);	
		ToolProperties.setPermanentSelectionMode(false);
		ToolProperties.setApplyAllArts(false);
		
		// if Preview All Art Layers is set on, turn it off
		if (settings.artLayer.boolViewAll)
			Action.perform("onActionPreviewModeToggle()", "artLayerResponder");

		if (softwareVer >= 16)
		{
			settings.frameModeButton.checked = false;
			settings.elementModeButton.checked = false;
		}
		else
		{
			ToolProperties.setApplyAllDrawings(false);	
			settings.syncedDrawingButton.checked = false;
			settings.singleDrawingButton.checked = false;
		}
		return settings;
	};


	this.captureSelectToolSettings = function(softwareVer)
	{
		var settings = {
			boolMarkee: false,
			boolSelectByColor: false,
			boolPermanentSelection:	Action.validate("onActionTogglePermanentSelection()","drawingView").checked,
			boolApplyAllLayers: Action.validate("onActionToggleApplyToolToAllLayers()","drawingView").checked,
			boolSyncedDrawing: false,	syncedDrawingButton: {},
			boolSingleDrawing: false,	singleDrawingButton: {},
			boolElementMode: false,		elementModeButton: {},
			boolFrameMode: false,		frameModeButton: {}
		};	
			
		if (softwareVer < 16)
			settings.boolApplyAllDrawings = Action.validate("onActionToggleApplyToAllDrawings()","drawingView").checked;
			
		var widgets = QApplication.allWidgets();
		for (var w in widgets)
		{
			var widget = widgets[w];
			if (widget.objectName === "SelectProperties")
			{
				var child = widget.children();
				for (var ch in child)
				{
					if (child[ch].objectName === "boxOptions")
					{
						var boxChild = child[ch].children();		
						for (var bx in boxChild)
						{
							if (boxChild[bx].objectName === "frameOptions1")
							{
								var frameChild = boxChild[bx].children();
								for (var fr in frameChild)
								{
									if (frameChild[fr].objectName === "buttonSelectTool" &&
									(frameChild[fr].toolTip === "Lasso" || frameChild[fr].toolTip === "Marquee"))
										settings.boolMarkee = (frameChild[fr].toolTip === "Lasso") ? true : false;
									else if (frameChild[fr].objectName === "buttonSelectByColor")
										settings.boolSelectByColor = frameChild[fr].checked;								
								}
							}
							else if (boxChild[bx].objectName === "frameOptions2")
							{
								var frameChild = boxChild[bx].children();	
								for (var fr in frameChild)
								{
									switch (frameChild[fr].objectName)
									{
										case "buttonElementMode" :
											settings.boolElementMode = frameChild[fr].checked;
											settings.elementModeButton = frameChild[fr]; break;
										case "buttonFrameMode" :
											settings.boolFrameMode = frameChild[fr].checked;										
											settings.frameModeButton = frameChild[fr]; break;
										case "buttonSingleDrawing" :
											settings.boolSingleDrawing = frameChild[fr].checked;										
											settings.singleDrawingButton = frameChild[fr]; break;
										case "buttonApplyLinkedDrawings" :
											settings.boolSyncedDrawing = frameChild[fr].checked;											
											settings.syncedDrawingButton = frameChild[fr];
									}
								}
							}
						}
						break;
					}
				}
				break;				
			}				
		}
		return settings;
	};


	this.captureArtLayerSettings = function()
	{
		var artLayerSettings = {};
		artLayerSettings.boolViewAll = Action.validate("onActionPreviewModeToggle()", "artLayerResponder").checked;
	
		var boolOverlay = Action.validate("onActionOverlayArtSelected()", "artLayerResponder").checked;
		var boolLine = Action.validate("onActionLineArtSelected()", "artLayerResponder").checked;
		var boolColor = Action.validate("onActionColorArtSelected()", "artLayerResponder").checked;

		if (boolOverlay)		artLayerSettings.activeArt = 8;
		else if (boolLine)		artLayerSettings.activeArt = 4;				
		else if (boolColor)	artLayerSettings.activeArt = 2;		
		else /*boolUnderlay*/	artLayerSettings.activeArt = 1;

		return artLayerSettings;
	};
	
	
	this.captureCurrentTool = function(softwareVer)
	{
		if (softwareVer >= 16)	
			return Tools.getToolSettings().currentTool.id;			
		else
		{
			var toolList = [
				"onActionChooseSelectTool()", "onActionChooseCutterTool()", "onActionChooseRepositionAllDrawingsTool()",
				"onActionChooseContourEditorTool()", "onActionChooseCenterlineEditorTool()", "onActionChoosePencilEditorTool()",
				"onActionChooseSpSmoothEditingTool()", "onActionChoosePerspectiveTool()", "onActionChooseEnvelopeTool()",
				"onActionChooseEditTransformTool()", "onActionChooseBrushTool()", "onActionChoosePencilTool()", "onActionChooseTextTool()",
				"onActionChooseEraserTool()", "onActionChoosePaintToolInPaintMode()", "onActionChooseInkTool()",
				"onActionChoosePaintToolInPaintUnpaintedMode()", "onActionChoosePaintToolInRepaintMode()",
				"onActionChoosePaintToolInUnpaintMode()", "onActionChooseStrokeTool()", "onActionChooseCloseGapTool()",
				"onActionChooseLineTool()", "onActionChooseRectangleTool()", "onActionChooseEllipseTool()", "onActionChoosePolylineTool()",
				"onActionChooseDropperTool()", "onActionChoosePivotTool()", "onActionChooseMorphTool()", "onActionChooseGrabberTool()",
				"onActionChooseZoomTool()", "onActionChooseRotateTool()", "onActionChooseSpTransformTool()", "onActionChooseSpInverseKinematicsTool()",
				"onActionChooseSpTranslateTool()", "onActionChooseSpRotateTool()", "onActionChooseSpScaleTool()", "onActionChooseSpSkewTool()",
				"onActionChooseSpMaintainSizeTool()", "onActionChooseSpSplineOffsetTool()", "onActionChooseSpRepositionTool()",
				"onActionChooseSpTransformTool()", "onActionChooseSpInverseKinematicsTool()",
			];	
			for (var tl in toolList)
				if (Action.validate(toolList[tl], "sceneUI").checked)
					return toolList[tl];	
		}
	};
	
	
	this.restoreOGSettings = function(softwareVer, settings)
	{
		if (softwareVer >= 16)	
		{
			Tools.setCurrentTool(settings.tool);
			settings.frameModeButton.checked = settings.boolFrameMode;
			settings.elementModeButton.checked = settings.boolElementMode;		
		}
		else
		{
			Action.perform(settings.tool, "sceneUI");	
			ToolProperties.setApplyAllDrawings(settings.boolApplyAllDrawings);	
			settings.syncedDrawingButton.checked = settings.boolSyncedDrawing;
			settings.singleDrawingButton.checked = settings.boolSingleDrawing;
		}		
		ToolProperties.setMarkeeMode(settings.boolMarkee);	
		ToolProperties.setSelectByColourMode(settings.boolSelectByColor);
		ToolProperties.setPermanentSelectionMode(settings.boolPermanentSelection);
		ToolProperties.setApplyAllArts(settings.boolApplyAllLayers);
		
		DrawingTools.setCurrentArt(settings.artLayer.activeArt);
		if (settings.artLayer.boolViewAll != Action.validate("onActionPreviewModeToggle()", "artLayerResponder").checked)
			Action.perform("onActionPreviewModeToggle()", "artLayerResponder");		
	};
	
	
	this.getParentWidget = function()
	{
		var topWidgets = QApplication.topLevelWidgets();
		for (var i in topWidgets)
			if (topWidgets[i] instanceof QMainWindow && !topWidgets[i].parentWidget())
				return topWidgets[i];
		return "";
	};

	
	this.createUI = function()
	{
		this.dialog = new QWidget(this.getParentWidget());	
		this.dialog.setWindowTitle("Contour Generator v" + scriptVer);		
		this.dialog.setWindowFlags(Qt.Tool);
		this.dialog.setAttribute(Qt.WA_DeleteOnClose);			
		
		this.dialog.mainLayout = new QVBoxLayout(this.dialog);		
		
		this.dialog.layersLayout = new QGridLayout(this.dialog);
		this.dialog.mainLayout.addLayout(this.dialog.layersLayout);

		this.dialog.srcBox = new QGroupBox("Source Layer");
		this.dialog.srcBoxLayout = new QVBoxLayout(this.dialog);		
		this.dialog.srcBox.setLayout(this.dialog.srcBoxLayout);		
		this.dialog.layersLayout.addWidget(this.dialog.srcBox, 0, 0);
		
		this.dialog.srcOverlayRB = new QRadioButton("Overlay");	
		this.dialog.srcBoxLayout.addWidget(this.dialog.srcOverlayRB, 0, 0);
		this.dialog.srcLineRB = new QRadioButton("Line Art");	
		this.dialog.srcBoxLayout.addWidget(this.dialog.srcLineRB, 0, 1);
		this.dialog.srcColorRB = new QRadioButton("Color Art");	
		this.dialog.srcBoxLayout.addWidget(this.dialog.srcColorRB, 0, 2);
		this.dialog.srcUnderlayRB = new QRadioButton("Underlay");	
		this.dialog.srcBoxLayout.addWidget(this.dialog.srcUnderlayRB, 0, 3);		
		
		this.dialog.dstBox = new QGroupBox("Destination Layer");
		this.dialog.dstBoxLayout = new QVBoxLayout(this.dialog);		
		this.dialog.dstBox.setLayout(this.dialog.dstBoxLayout);		
		this.dialog.layersLayout.addWidget(this.dialog.dstBox, 0, 1);
		
		this.dialog.dstOverlayRB = new QRadioButton("Overlay");	
		this.dialog.dstBoxLayout.addWidget(this.dialog.dstOverlayRB, 0, 0);
		this.dialog.dstLineRB = new QRadioButton("Line Art");	
		this.dialog.dstBoxLayout.addWidget(this.dialog.dstLineRB, 0, 1);
		this.dialog.dstColorRB = new QRadioButton("Color Art");	
		this.dialog.dstBoxLayout.addWidget(this.dialog.dstColorRB, 0, 2);
		this.dialog.dstUnderlayRB = new QRadioButton("Underlay");	
		this.dialog.dstBoxLayout.addWidget(this.dialog.dstUnderlayRB, 0, 3);		
		
		this.dialog.optionBox = new QGroupBox("Options");
		this.dialog.optionBoxLayout = new QVBoxLayout(this.dialog);		
		this.dialog.optionBox.setLayout(this.dialog.optionBoxLayout);		
		
		this.dialog.contourBox = new QGroupBox("Generate contour on ...");		
		this.dialog.contourBoxLayout = new QHBoxLayout(this.dialog);		
		this.dialog.contourBox.setLayout(this.dialog.contourBoxLayout);		
		this.dialog.optionBoxLayout.addWidget(this.dialog.contourBox, 0, 1);

		this.dialog.mergeRB = new QRadioButton("Outline Only");	
		this.dialog.contourBoxLayout.addWidget(this.dialog.mergeRB, 0, 0);
		this.dialog.separateRB = new QRadioButton("All Color Boundaries");	
		this.dialog.contourBoxLayout.addWidget(this.dialog.separateRB, 0, 1);		
		
		this.dialog.stylesBox = new QGroupBox("Join Style / Line Weight");		
		this.dialog.stylesBoxLayout = new QHBoxLayout(this.dialog);		
		this.dialog.stylesBox.setLayout(this.dialog.stylesBoxLayout);		
		this.dialog.optionBoxLayout.addWidget(this.dialog.stylesBox, 0, 2);		
		
		this.dialog.joinStyleCombo = new QComboBox();		
		this.dialog.joinStyleCombo.maxVisibleItems = 3;
		this.dialog.joinStyleCombo.addItems(["Round", "Mitre", "Bevel"]);		
		this.dialog.stylesBoxLayout.addWidget(this.dialog.joinStyleCombo, 0, 0);					
					
		this.dialog.thicknessSpin = new QDoubleSpinBox(this.dialog);
		this.dialog.thicknessSpin.singleStep = 0.1;
		this.dialog.thicknessSpin.setValue(0.8);
		this.dialog.thicknessSpin.minimum = 0.01;		
		this.dialog.thicknessSpin.maximum = 1600;
		this.dialog.thicknessSpin.stepBy(0.01);
		this.dialog.stylesBoxLayout.addWidget(this.dialog.thicknessSpin, 0, 1);				
		
		this.dialog.mainLayout.addWidget(this.dialog.optionBox, 0, 1);	
	
		this.dialog.buttonBox = new QGroupBox();
		this.dialog.buttonBox.setStyleSheet("QGroupBox{border: 0px; padding: 0px}");
		this.dialog.buttonBoxLayout = new QGridLayout(this.dialog);		
		this.dialog.buttonBox.setLayout(this.dialog.buttonBoxLayout);
		
		var imagePath = specialFolders.userScripts + "/script-icons";	

		this.dialog.selectedFrameButton = new QPushButton("On Selected Frames");	
		this.dialog.selectedFrameButton.icon = new QIcon(imagePath + "/ANM_Contour_Generator_Selected_Frames.png");
		this.dialog.selectedFrameButton.setIconSize(new QSize(28,28));		
		this.dialog.buttonBoxLayout.addWidget(this.dialog.selectedFrameButton, 1, 0);

		this.dialog.applyAllButton = new QPushButton("On All Frames");		
		this.dialog.applyAllButton.icon = new QIcon(imagePath + "/ANM_Contour_Generator_Apply_All.png");
		this.dialog.applyAllButton.setIconSize(new QSize(28,28));		
		this.dialog.buttonBoxLayout.addWidget(this.dialog.applyAllButton, 1, 1);		
	
		this.dialog.mainLayout.addWidget(this.dialog.buttonBox, 0, 2);

		this.dialog.toolTipLabel = new QLabel("");	
		this.dialog.toolTipLabel.alignment = (Qt.AlignCenter);	
		this.dialog.mainLayout.addWidget(this.dialog.toolTipLabel, 0, 3);		
	
		return this.dialog;
	};
}