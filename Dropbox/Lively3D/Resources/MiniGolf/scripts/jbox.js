(function(jigLib){
	var Vector3D=jigLib.Vector3D;
	var Matrix3D=jigLib.Matrix3D;
	var JMatrix3D=jigLib.JMatrix3D;
        var JNumber3D=jigLib.JNumber3D;
        var ISkin3D=jigLib.ISkin3D;
        var PhysicsState=jigLib.PhysicsState;
	var RigidBody=jigLib.RigidBody;
	var EdgeData=jigLib.EdgeData;
	var SpanData=jigLib.SpanData;

	/**
         * @author Muzer(muzerly@gmail.com)
         * @link http://code.google.com/p/jiglibflash
         */
	
	var JBox=function(skin, width, depth, height){
		this.super(skin);
		
		this._edges=[
                        new EdgeData( 0, 1 ), new EdgeData( 3, 1 ), new EdgeData( 2, 3 ),
                        new EdgeData( 2, 0 ), new EdgeData( 4, 5 ), new EdgeData( 5, 7 ),
                        new EdgeData( 6, 7 ), new EdgeData( 4, 6 ), new EdgeData( 7, 1 ),
                        new EdgeData( 5, 3 ), new EdgeData( 4, 2 ), new EdgeData( 6, 0 )];
		
		this._face=[
                        [6, 7, 1, 0], [5, 4, 2, 3],
                        [3, 1, 7, 5], [4, 6, 0, 2],
                        [1, 3, 2, 0], [7, 6, 4, 5]]
		
		this._type = "BOX";

		this._sideLengths = new Vector3D(width, depth, height);
		this._boundingSphere = 0.5 * this._sideLengths.get_length();
		this.initPoint();
		this.set_mass(1);
		this.updateBoundingBox();
	}
	jigLib.extends(JBox,jigLib.RigidBody);
	JBox.prototype._sideLengths=null;
        JBox.prototype._points=null;
        JBox.prototype._edges=null; 
        JBox.prototype._face=null; 
	
        JBox.prototype.initPoint=function(){
		var halfSide = this.getHalfSideLengths();
		this._points = [];
		this._points[0] = new Vector3D(halfSide.x, -halfSide.y, halfSide.z);
		this._points[1] = new Vector3D(halfSide.x, halfSide.y, halfSide.z);
		this._points[2] = new Vector3D(-halfSide.x, -halfSide.y, halfSide.z);
		this._points[3] = new Vector3D(-halfSide.x, halfSide.y, halfSide.z);
		this._points[4] = new Vector3D(-halfSide.x, -halfSide.y, -halfSide.z);
		this._points[5] = new Vector3D(-halfSide.x, halfSide.y, -halfSide.z);
		this._points[6] = new Vector3D(halfSide.x, -halfSide.y, -halfSide.z);
		this._points[7] = new Vector3D(halfSide.x, halfSide.y, -halfSide.z);
	}

        JBox.prototype.set_sideLengths=function(size){
		this._sideLengths = size.clone();
		this._boundingSphere = 0.5 * this._sideLengths.length;
		this.initPoint();
		this.setInertia(this.getInertiaProperties(this.get_mass()));
		this.setActive();
		this.updateBoundingBox();
	}

	//Returns the full side lengths
        JBox.prototype.get_sideLengths=function(){
		return this._sideLengths;
	}

        JBox.prototype.get_edges=function(){
		return this._edges;
	}

        JBox.prototype.getVolume=function(){
		return (this._sideLengths.x * this._sideLengths.y * this._sideLengths.z);
	}

        JBox.prototype.getSurfaceArea=function(){
		return 2 * (this._sideLengths.x * this._sideLengths.y + this._sideLengths.x * this._sideLengths.z + this._sideLengths.y * this._sideLengths.z);
	}

	// Returns the half-side lengths
        JBox.prototype.getHalfSideLengths=function(){
		return JNumber3D.getScaleVector(this._sideLengths, 0.5);
	}
	

	// Gets the minimum and maximum extents of the box along the axis, relative to the centre of the box.
        JBox.prototype.getSpan=function(axis){
		var cols= this.get_currentState().getOrientationCols();
		var obj = new SpanData();
		var s = Math.abs(axis.dotProduct(cols[0])) * (0.5 * this._sideLengths.x);
		var u = Math.abs(axis.dotProduct(cols[1])) * (0.5 * this._sideLengths.y);
		var d = Math.abs(axis.dotProduct(cols[2])) * (0.5 * this._sideLengths.z);
		var r = s + u + d;
		var p = this.get_currentState().position.dotProduct(axis);
		obj.min = p - r;
		obj.max = p + r;

		return obj;
	}
                
	// Gets the corner points
        JBox.prototype.getCornerPoints=function(state){
		var vertex;
		var arr = [];
                        
		var transform = JMatrix3D.getTranslationMatrix(state.position.x, state.position.y, state.position.z);
		transform = JMatrix3D.getAppendMatrix3D(state.get_orientation(), transform);
                        
		for(var i=0;i<this._points.length;i++){
			var _point=this._points[i];
			vertex = new Vector3D(_point.x, _point.y, _point.z);
			JMatrix3D.multiplyVector(transform, vertex);
			arr.push(vertex);
			//arr.push(transform.transformVector(new Vector3D(_point.x, _point.y, _point.z)));
		}
		//arr.fixed = true;
		return arr;
	}
                
        JBox.prototype.getSqDistanceToPoint=function(state, closestBoxPoint, point){
		closestBoxPoint.pos = point.subtract(state.position);
		JMatrix3D.multiplyVector(JMatrix3D.getTransposeMatrix(state.get_orientation()), closestBoxPoint.pos);

		var delta = 0;
		var sqDistance = 0;
		var halfSideLengths = this.getHalfSideLengths();

		if (closestBoxPoint.pos.x < -halfSideLengths.x){
			delta = closestBoxPoint.pos.x + halfSideLengths.x;
			sqDistance += (delta * delta);
			closestBoxPoint.pos.x = -halfSideLengths.x;
		}else if (closestBoxPoint.pos.x > halfSideLengths.x){
			delta = closestBoxPoint.pos.x - halfSideLengths.x;
			sqDistance += (delta * delta);
			closestBoxPoint.pos.x = halfSideLengths.x;
		}

		if (closestBoxPoint.pos.y < -halfSideLengths.y){
			delta = closestBoxPoint.pos.y + halfSideLengths.y;
			sqDistance += (delta * delta);
			closestBoxPoint.pos.y = -halfSideLengths.y;
		}else if (closestBoxPoint.pos.y > halfSideLengths.y){
			delta = closestBoxPoint.pos.y - halfSideLengths.y;
			sqDistance += (delta * delta);
			closestBoxPoint.pos.y = halfSideLengths.y;
		}

		if (closestBoxPoint.pos.z < -halfSideLengths.z){
			delta = closestBoxPoint.pos.z + halfSideLengths.z;
			sqDistance += (delta * delta);
			closestBoxPoint.pos.z = -halfSideLengths.z;
		}else if (closestBoxPoint.pos.z > halfSideLengths.z){
			delta = (closestBoxPoint.pos.z - halfSideLengths.z);
			sqDistance += (delta * delta);
			closestBoxPoint.pos.z = halfSideLengths.z;
		}
		JMatrix3D.multiplyVector(state.get_orientation(), closestBoxPoint.pos);
		closestBoxPoint.pos = state.position.add(closestBoxPoint.pos);
		return sqDistance;
	}

	// Returns the distance from the point to the box, (-ve if the
	// point is inside the box), and optionally the closest point on the box.
        JBox.prototype.getDistanceToPoint=function(state, closestBoxPoint, point){
		return Math.sqrt(this.getSqDistanceToPoint(state, closestBoxPoint, point));
	}

        JBox.prototype.pointIntersect=function(pos){
		var p = pos.subtract(this.get_currentState().position);
		var h = JNumber3D.getScaleVector(this._sideLengths, 0.5);
		var dirVec;
		var cols = this.get_currentState().getOrientationCols();
		for (var dir; dir < 3; dir++){
			dirVec = cols[dir].clone();
			dirVec.normalize();
			if (Math.abs(dirVec.dotProduct(p)) > JNumber3D.toArray(h)[dir] + JNumber3D.NUM_TINY){
				return false;
			}
		}
		return true;
	}

        JBox.prototype.getSupportVertices=function(axis){
		var vertices = [];
		var d = [1,1,1];
		var H;
		var temp = this.get_currentState().getOrientationCols();
		temp[0].normalize();
		temp[1].normalize();
		temp[2].normalize();
		for (var i = 0; i < 3; i++){
			d[i] = axis.dotProduct(temp[i]);
			if (Math.abs(d[i]) > 1 - 0.001){
				var f = (d[i] < 0) ? (i * 2) : (i * 2) + 1;
				for (var j = 0; j < 4; j++){
					H = this._points[this._face[f][j]];
					var _vj = vertices[j] = this.get_currentState().position.clone();
					_vj = _vj.add(JNumber3D.getScaleVector(temp[0], H.x));
					_vj = _vj.add(JNumber3D.getScaleVector(temp[1], H.y));
					_vj = _vj.add(JNumber3D.getScaleVector(temp[2], H.z));
				}
				return vertices;
			}
		}

		for (i = 0; i < 3; i++){
			if (Math.abs(d[i]) < 0.005){
				var k;
				var m = (i + 1) % 3;
				var n = (i + 2) % 3;

				H = this.get_currentState().position.clone();
				k = (d[m] > 0) ? -1 : 1;
				H = H.add(JNumber3D.getScaleVector(temp[m], k * JNumber3D.toArray(this._sideLengths)[m] / 2));
				k = (d[n] > 0) ? -1 : 1;
				H = H.add(JNumber3D.getScaleVector(temp[n], k * JNumber3D.toArray(this._sideLengths)[n] / 2));

				vertices[0] = H.add(JNumber3D.getScaleVector(temp[i], JNumber3D.toArray(this._sideLengths)[i] / 2));
				vertices[1] = H.add(JNumber3D.getScaleVector(temp[i], -JNumber3D.toArray(this._sideLengths)[i] / 2));
				return vertices;
			}
		}

		var _v0 =vertices[0] = this.get_currentState().position.clone();
		k = (d[0] > 0) ? -1 : 1;
		vertices[0] = _v0.add(JNumber3D.getScaleVector(temp[0], k *this. _sideLengths.x / 2));
		k = (d[1] > 0) ? -1 : 1;
		vertices[0] = _v0.add(JNumber3D.getScaleVector(temp[1], k * this._sideLengths.y / 2));
		k = (d[2] > 0) ? -1 : 1;
		vertices[0] = _v0.add(JNumber3D.getScaleVector(temp[2], k * this._sideLengths.z / 2));
		return vertices;
	}
	

        JBox.prototype.segmentIntersect=function(out, seg, state){
		out.fracOut = 0;
		out.posOut = new Vector3D();
		out.normalOut = new Vector3D();

		var frac = JNumber3D.NUM_HUGE;
		var min = -JNumber3D.NUM_HUGE;
		var max = JNumber3D.NUM_HUGE;
		var dirMin = 0;
		var dirMax = 0;
		var dir = 0;
		var p = state.position.subtract(seg.get_origin());
		var h = JNumber3D.getScaleVector(this._sideLengths, 0.5);

		//var tempV:Vector3D;
		var e;
		var f;
		var t;
		var t1;
		var t2;
                        
		var orientationCol = state.getOrientationCols();
		var directionVectorArray = JNumber3D.toArray(h);
		var directionVectorNumber;
		for (dir = 0; dir < 3; dir++){
			directionVectorNumber = directionVectorArray[dir];
			e = orientationCol[dir].dotProduct(p);
			f = orientationCol[dir].dotProduct(seg.get_delta());
			if (Math.abs(f) > JNumber3D.NUM_TINY){
				t1 = (e + directionVectorNumber) / f;
				t2 = (e - directionVectorNumber) / f;
				if (t1 > t2){
					t = t1;
					t1 = t2;
					t2 = t;
				}
				if (t1 > min){
					min = t1;
					dirMin = dir;
				}
				if (t2 < max){
					max = t2;
					dirMax = dir;
				}
				if (min > max) return false;
				if (max < 0) return false;
			}else if (-e - directionVectorNumber > 0 || -e + directionVectorNumber < 0){
				return false;
			}
		}

		if (min > 0){
			dir = dirMin;
			frac = min;
		}else{
			dir = dirMax;
			frac = max;
		}
		if (frac < 0) frac = 0;
		/*if (frac > 1)
		frac = 1;*/
		if (frac > 1 - JNumber3D.NUM_TINY){
			return false;
		}
		out.fracOut = frac;
		out.posOut = seg.getPoint(frac);
		if (orientationCol[dir].dotProduct(seg.get_delta()) < 0){
			out.normalOut = JNumber3D.getScaleVector(orientationCol[dir], -1);
		}else{
			out.normalOut = orientationCol[dir];
		}
		return true;
	}

        JBox.prototype.getInertiaProperties=function(m){
		return JMatrix3D.getScaleMatrix(
		(m / 12) * (this._sideLengths.y * this._sideLengths.y + this._sideLengths.z * this._sideLengths.z),
		(m / 12) * (this._sideLengths.x * this._sideLengths.x + this._sideLengths.z * this._sideLengths.z),
		(m / 12) * (this._sideLengths.x * this._sideLengths.x + this._sideLengths.y * this._sideLengths.y))
	}
                
        JBox.prototype.updateBoundingBox=function(){
		this._boundingBox.clear();
		this._boundingBox.addBox(this);
	}
	
	jigLib.JBox=JBox;
	
})(jigLib)	
