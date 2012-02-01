/*
   Copyright (c) 2007 Danny Chapman
   http://www.rowlhouse.co.uk

   This software is provided 'as-is', without any express or implied
   warranty. In no event will the authors be held liable for any damages
   arising from the use of this software.
   Permission is granted to anyone to use this software for any purpose,
   including commercial applications, and to alter it and redistribute it
   freely, subject to the following restrictions:
   1. The origin of this software must not be misrepresented; you must not
   claim that you wrote the original software. If you use this software
   in a product, an acknowledgment in the product documentation would be
   appreciated but is not required.
   2. Altered source versions must be plainly marked as such, and must not be
   misrepresented as being the original software.
   3. This notice may not be removed or altered from any source
   distribution.
 */

/**
 * @author Muzer(muzerly@gmail.com)
 * @link http://code.google.com/p/jiglibflash
 */
(function(jigLib){
	var Vector3D=jigLib.Vector3D;
	var Matrix3D=jigLib.Matrix3D;
	var JMatrix3D=jigLib.JMatrix3D;
        var JNumber3D=jigLib.JNumber3D;
        var JConstraint=jigLib.JConstraint;
        var JSegment=jigLib.JSegment;
        var JConfig=jigLib.JConfig;
        var JSphere=jigLib.JSphere;
	var MaterialProperties=jigLib.MaterialProperties;
	var PhysicsState=jigLib.PhysicsState;
	var EdgeData=jigLib.EdgeData;
	var SpanData=jigLib.SpanData;
	var CollPointInfo=jigLib.CollPointInfo;
	var CollisionInfo=jigLib.CollisionInfo;

	var CollDetectBoxBox=function(){
		this.name = "BoxBox";
		this.type0 = "BOX";
		this.type1 = "BOX";
	}
	
	jigLib.extends(CollDetectBoxBox,jigLib.CollDetectFunctor);
	
	CollDetectBoxBox.prototype.MAX_SUPPORT_VERTS = 10;
	CollDetectBoxBox.prototype.combinationDist=null;

	//Returns true if disjoint.  Returns false if intersecting
	CollDetectBoxBox.prototype.disjoint=function(out, axis, box0, box1){
		var obj0 = box0.getSpan(axis);
		var obj1 = box1.getSpan(axis);
		var obj0Min = obj0.min;
		var obj0Max = obj0.max;
		var obj1Min = obj1.min;
		var obj1Max = obj1.max;
                        
		if (obj0Min > (obj1Max + JConfig.collToll + JNumber3D.NUM_TINY) || obj1Min > (obj0Max + JConfig.collToll + JNumber3D.NUM_TINY)){
			out.flag = true;
			return true;
		}
		if ((obj0Max > obj1Max) && (obj1Min > obj0Min)){
			out.depth = Math.min(obj0Max - obj1Min, obj1Max - obj0Min);
		}else if ((obj1Max > obj0Max) && (obj0Min > obj1Min)){
			out.depth = Math.min(obj1Max - obj0Min, obj0Max - obj1Min);
		}else{
			out.depth = Math.min(obj0Max, obj1Max);
			out.depth -= Math.max(obj0Min, obj1Min);
		}
		out.flag = false;
		return false;
	}

	CollDetectBoxBox.prototype.addPoint=function(contactPoints, pt, combinationDistanceSq){
		for(var i=0; i<contactPoints.length;i++){
			var contactPoint=contactPoints[i]
			if (contactPoint.subtract(pt).lengthSquared < combinationDistanceSq){
				contactPoint = JNumber3D.getDivideVector(contactPoint.add(pt), 2);
				return false;
			}
		}
		contactPoints.push(pt);
		return true;
	}

	CollDetectBoxBox.prototype.getBox2BoxEdgesIntersectionPoints=function(contactPoint, box0, box1, newState){
		var num = 0;
		var seg;
		var box0State = (newState) ? box0.get_currentState() : box0.get_oldState();
		var box1State = (newState) ? box1.get_currentState() : box1.get_oldState();
		var boxPts = box1.getCornerPoints(box1State);
		var boxEdges = box1.get_edges();
		var outObj;

		for(var i=0;i<boxEdges.length;i++){
			boxEdge=boxEdges[i];
			outObj = {};
			seg = new JSegment(boxPts[boxEdge.ind0], boxPts[boxEdge.ind1].subtract(boxPts[boxEdge.ind0]));
			if (box0.segmentIntersect(outObj, seg, box0State)){
				if (this.addPoint(contactPoint, outObj.posOut, combinationDist)){
					num += 1;
				}
			}
		}
		return num;
	}

	CollDetectBoxBox.prototype.getBoxBoxIntersectionPoints=function(contactPoint, box0, box1, newState){
		this.getBox2BoxEdgesIntersectionPoints(contactPoint, box0, box1, newState);
		this.getBox2BoxEdgesIntersectionPoints(contactPoint, box1, box0, newState);
		return contactPoint.length;
	}
	
	/*
	* Original Author: Olivier renault
	* http://uk.geocities.com/olivier_rebellion/
	*/
	CollDetectBoxBox.prototype.getPointPointContacts=function(PA, PB, CA, CB){
		CA.push(PA.clone());
		CB.push(PB.clone());
	}

	CollDetectBoxBox.prototype.getPointEdgeContacts=function(PA, PB0, PB1, CA, CB){
		var B0A = PA.subtract(PB0);
		var BD = PB1.subtract(PB0);

		var t = B0A.dotProduct(BD) / BD.dotProduct(BD);
		if (t < 0){
			t = 0;
		}else if (t > 1){
			t = 1;
		}

		CA.push(PA.clone());
		CB.push(PB0.add(JNumber3D.getScaleVector(BD, t)));
	}

	CollDetectBoxBox.prototype.getPointFaceContacts=function(PA, BN, BD, CA, CB){
		var dist = PA.dotProduct(BN) - BD;

		this.addPoint(CA, PA.clone(), combinationDist);
		this.addPoint(CB, PA.subtract(JNumber3D.getScaleVector(BN, dist)), combinationDist);
		//CA.push(PA.clone());
		//CB.push(PA.subtract(JNumber3D.getScaleVector(BN, dist)));
	}

	CollDetectBoxBox.prototype.getEdgeEdgeContacts=function(PA0, PA1, PB0, PB1, CA, CB){
		var AD = PA1.subtract(PA0);
		var BD = PB1.subtract(PB0);
		var N = AD.crossProduct(BD);
		var M = N.crossProduct(BD);
		var md = M.dotProduct(PB0);
		var at = (md - PA0.dotProduct(M)) / AD.dotProduct(M);
		if (at < 0){
			at = 0;
		}else if (at > 1){
			at = 1;
		}

		this.getPointEdgeContacts(PA0.add(JNumber3D.getScaleVector(AD, at)), PB0, PB1, CA, CB);
	}

	CollDetectBoxBox.prototype.getPolygonContacts=function(Clipper, Poly, CA, CB){
		if (!this.polygonClip(Clipper, Poly, CB)){
			return;
		}
		var ClipperNormal = JNumber3D.getNormal(Clipper[0], Clipper[1], Clipper[2]);
		var clipper_d = Clipper[0].dotProduct(ClipperNormal);

		var temp = [];
		for(var i=0; i<CB.length;i++){
			cb=CB[i];
			this.getPointFaceContacts(cb, ClipperNormal, clipper_d, temp, CA);
		}
	}

	
	CollDetectBoxBox.prototype.polygonClip=function(axClipperVertices, axPolygonVertices, axClippedPolygon){
		if (axClipperVertices.length <= 2){
			return false;
		}
		var ClipperNormal = JNumber3D.getNormal(axClipperVertices[0], axClipperVertices[1], axClipperVertices[2]);

		var i = axClipperVertices.length - 1;
		var N;
		var D;
		var temp = axPolygonVertices.concat();
		var len = axClipperVertices.length;
		for (var ip1 = 0; ip1 < len; i = ip1, ip1++){
			D = axClipperVertices[ip1].subtract(axClipperVertices[i]);
			N = D.crossProduct(ClipperNormal);
			var dis = axClipperVertices[i].dotProduct(N);

			if (!this.planeClip(temp, axClippedPolygon, N, dis)){
				return false;
			}
			temp = axClippedPolygon.concat();
		}
		return true;
	}

	CollDetectBoxBox.prototype.planeClip=function(A, B, xPlaneNormal, planeD){
		var bBack = [];
		var bBackVerts = false;
		var bFrontVerts = false;

		var side;
		for (var s in A){
			side = A[s].dotProduct(xPlaneNormal) - planeD;
			bBack[s] = (side < 0) ? true : false;
			bBackVerts = bBackVerts || bBack[s];
			bFrontVerts = bBackVerts || !bBack[s];
		}

		if (!bBackVerts){
			return false;
		}
		if (!bFrontVerts){
			for (s in A)
			{
				B[s] = A[s].clone();
			}
			return true;
		}

		var n = 0;
		var i = A.length - 1;
		var max = (A.length > 2) ? A.length : 1;
		for (var ip1 = 0; ip1 < max; i = ip1, ip1++){
			if (bBack[i]){
				if (n >= MAX_SUPPORT_VERTS){
					return true;
				}
				B[n++] = A[i].clone();
			}

			if (int(bBack[ip1]) ^ int(bBack[i])){
				if (n >= MAX_SUPPORT_VERTS){
					return true;
				}
				var D = A[ip1].subtract(A[i]);
				var t = (planeD - A[i].dotProduct(xPlaneNormal)) / D.dotProduct(xPlaneNormal);
				B[n++] = A[i].add(JNumber3D.getScaleVector(D, t));
			}
		}

		return true;
	}

	CollDetectBoxBox.prototype.collDetect=function(info, collArr){
		var box0 = info.body0;
		var box1 = info.body1;

		if (!box0.hitTestObject3D(box1)){
			return;
		}
                        
		if (JConfig.aabbDetection && !box0.get_boundingBox().overlapTest(box1.get_boundingBox())) {
			return;
		}

		var numTiny = JNumber3D.NUM_TINY;
		var numHuge = JNumber3D.NUM_HUGE;
                        
		var dirs0Arr = box0.get_currentState().getOrientationCols();
		var dirs1Arr = box1.get_currentState().getOrientationCols();

		// the 15 potential separating axes
		var axes = [dirs0Arr[0], dirs0Arr[1], dirs0Arr[2],
			dirs1Arr[0], dirs1Arr[1], dirs1Arr[2],
			dirs0Arr[0].crossProduct(dirs1Arr[0]),
			dirs0Arr[1].crossProduct(dirs1Arr[0]),
			dirs0Arr[2].crossProduct(dirs1Arr[0]),
			dirs0Arr[0].crossProduct(dirs1Arr[1]),
			dirs0Arr[1].crossProduct(dirs1Arr[1]),
			dirs0Arr[2].crossProduct(dirs1Arr[1]),
			dirs0Arr[0].crossProduct(dirs1Arr[2]),
			dirs0Arr[1].crossProduct(dirs1Arr[2]),
			dirs0Arr[2].crossProduct(dirs1Arr[2])];

		var l2;
		// the overlap depths along each axis
		var overlapDepths = [];
		var i = 0;
		var axesLength = axes.length;

		// see if the boxes are separate along any axis, and if not keep a 
		// record of the depths along each axis
		for (i = 0; i < axesLength; i++){
			var _overlapDepth = overlapDepths[i] = new SpanData();
			_overlapDepth.depth = numHuge;

			l2 = axes[i].get_lengthSquared();
			if (l2 < numTiny){
				continue;
			}
			var ax = axes[i].clone();
			ax.normalize();
			if (this.disjoint(overlapDepths[i], ax, box0, box1)){
				return;
			}
		}

		// The box overlap, find the separation depth closest to 0.
		var minDepth = numHuge;
		var minAxis = -1;
		axesLength = axes.length;
		for (i = 0; i < axesLength; i++){
			l2 = axes[i].get_lengthSquared();
			if (l2 < numTiny){
				continue;
			}

			// If this axis is the minimum, select it
			if (overlapDepths[i].depth < minDepth){
				minDepth = overlapDepths[i].depth;
				minAxis = i|0;
			}
		}
		if (minAxis == -1){
			return;
		}
		// Make sure the axis is facing towards the box0. if not, invert it
		var N = axes[minAxis].clone();
		if (box1.get_currentState().position.subtract(box0.get_currentState().position).dotProduct(N) > 0){
			N = JNumber3D.getScaleVector(N, -1);
		}
		N.normalize();

		if (JConfig.boxCollisionsType == "EDGEBASE"){
			this.boxEdgesCollDetect(info, collArr, box0, box1, N, minDepth);
		}else{
			this.boxSortCollDetect(info, collArr, box0, box1, N, minDepth);
		}
	}
	
	CollDetectBoxBox.prototype.boxEdgesCollDetect=function(info, collArr, box0, box1, N, depth){
		var contactPointsFromOld = true;
		var contactPoints = [];
		combinationDist = 0.5 * Math.min(Math.min(box0.get_sideLengths().x, box0.get_sideLengths().y, box0.get_sideLengths().z), Math.min(box1.get_sideLengths().x, box1.get_sideLengths().y, box1.get_sideLengths().z));
		combinationDist *= combinationDist;

		if (depth > -JNumber3D.NUM_TINY){
			this.getBoxBoxIntersectionPoints(contactPoints, box0, box1, false);
		}
		if (contactPoints.length == 0){
			contactPointsFromOld = false;
			this.getBoxBoxIntersectionPoints(contactPoints, box0, box1, true);
		}

		var bodyDelta = box0.get_currentState().position.subtract(box0.get_oldState().position).subtract(box1.get_currentState().position.subtract(box1.get_oldState().position));
		var bodyDeltaLen = bodyDelta.dotProduct(N);
		var oldDepth = depth + bodyDeltaLen;

		var collPts = [];
		if (contactPoints.length > 0){
			var box0ReqPosition;
			var box1ReqPosition;
			var cpInfo;
                                
			if (contactPointsFromOld){
				box0ReqPosition = box0.get_oldState().position;
				box1ReqPosition = box1.get_oldState().position;
			}else{
				box0ReqPosition = box0.get_currentState().position;
				box1ReqPosition = box1.get_currentState().position;
			}
        
			for(var i=0; i<contactPoints.length;i++){
				contactPoint=contactPoints[i];
				cpInfo = new CollPointInfo();
				cpInfo.r0 = contactPoint.subtract( box0ReqPosition);
				cpInfo.r1 = contactPoint.subtract( box1ReqPosition);
				cpInfo.initialPenetration = oldDepth;
				collPts.push(cpInfo);
			}

			var collInfo = new CollisionInfo();
			collInfo.objInfo = info;
			collInfo.dirToBody = N;
			collInfo.pointInfo = collPts;

			var mat = new MaterialProperties();
			mat.set_restitution(Math.sqrt(box0.get_material().get_restitution() * box1.get_material().get_restitution()));
			mat.set_friction(Math.sqrt(box0.get_material().get_friction() * box1.get_material().get_friction()));
			collInfo.mat = mat;
			collArr.push(collInfo);

			info.body0.collisions.push(collInfo);
			info.body1.collisions.push(collInfo);
		}
	}

	CollDetectBoxBox.prototype.boxSortCollDetect=function(info, collArr, box0, box1, N, depth){
		var contactA = [];
		var contactB = [];
		var supportVertA = box0.getSupportVertices(N);
		var supportVertB = box1.getSupportVertices(JNumber3D.getScaleVector(N, -1));
		var iNumVertsA = supportVertA.length;
		var iNumVertsB = supportVertB.length;

		combinationDist = 0.2 * Math.min(Math.min(box0.get_sideLengths().x, box0.get_sideLengths().y, box0.get_sideLengths().z), Math.min(box1.get_sideLengths().x, box1.get_sideLengths().y, box1.get_sideLengths().z));
		combinationDist *= combinationDist;

		if (iNumVertsA == 1){
			if (iNumVertsB == 1){
				//trace("++++ iNumVertsA=1::::iNumVertsB=1");
				this.getPointPointContacts(supportVertA[0], supportVertB[0], contactA, contactB);
			}else if (iNumVertsB == 2){
				//trace("++++ iNumVertsA=1::::iNumVertsB=2");
				this.getPointEdgeContacts(supportVertA[0], supportVertB[0], supportVertB[1], contactA, contactB);
			}else{
				//trace("++++ iNumVertsA=1::::iNumVertsB=4");
				var BN = JNumber3D.getNormal(supportVertB[0], supportVertB[1], supportVertB[2]);
				var BD = BN.dotProduct(supportVertB[0]);
				this.getPointFaceContacts(supportVertA[0], BN, BD, contactA, contactB);
			}
		}else if (iNumVertsA == 2){
			if (iNumVertsB == 1){
				//trace("++++ iNumVertsA=2::::iNumVertsB=1");
				this.getPointEdgeContacts(supportVertB[0], supportVertA[0], supportVertA[1], contactB, contactA);
			}else if (iNumVertsB == 2){
				//trace("++++ iNumVertsA=2::::iNumVertsB=2");
				this.getEdgeEdgeContacts(supportVertA[0], supportVertA[1], supportVertB[0], supportVertB[1], contactA, contactB);
			}else{
				//trace("++++ iNumVertsA=2::::iNumVertsB=4");
				this.getPolygonContacts(supportVertB, supportVertA, contactB, contactA);
			}
		}else{
			if (iNumVertsB == 1){
				//trace("++++ iNumVertsA=4::::iNumVertsB=1");
				BN = JNumber3D.getNormal(supportVertA[0], supportVertA[1], supportVertA[2]);
				BD = BN.dotProduct(supportVertA[0]);
				this.getPointFaceContacts(supportVertB[0], BN, BD, contactB, contactA);
			}else{
				//trace("++++ iNumVertsA=4::::iNumVertsB=4");
				this.getPolygonContacts(supportVertA, supportVertB, contactA, contactB);
			}
		}
		if (contactB.length > contactA.length){
			contactA = contactB;
		}
		if (contactA.length > contactB.length){
			contactB = contactA;
		}

		var cpInfo;
		var collPts = [];
		if (contactA.length > 0 && contactB.length > 0){
			var num = (contactA.length > contactB.length) ? contactB.length : contactA.length;
			for (var j= 0; j < num; j++){
				cpInfo = new CollPointInfo();
				cpInfo.r0 = contactA[j].subtract(box0.get_currentState().position);
				cpInfo.r1 = contactB[j].subtract(box1.get_currentState().position);
				cpInfo.initialPenetration = depth;
				collPts.push(cpInfo);
			}
		}else{
			cpInfo = new CollPointInfo();
			cpInfo.r0 = new Vector3D();
			cpInfo.r1 = new Vector3D();
			cpInfo.initialPenetration = depth;
			collPts.push(cpInfo);
		}

		var collInfo = new CollisionInfo();
		collInfo.objInfo = info;
		collInfo.dirToBody = N;
		collInfo.pointInfo = collPts;

		var mat = new MaterialProperties();
		mat.set_restitution(Math.sqrt(box0.get_material().get_restitution() * box1.get_material().get_restitution()));
		mat.set_friction(Math.sqrt(box0.get_material().get_friction() * box1.get_material().get_friction()));
		collInfo.mat = mat;
		collArr.push(collInfo);

		info.body0.collisions.push(collInfo);
		info.body1.collisions.push(collInfo);
	}
	
	jigLib.CollDetectBoxBox=CollDetectBoxBox;
	
})(jigLib)
