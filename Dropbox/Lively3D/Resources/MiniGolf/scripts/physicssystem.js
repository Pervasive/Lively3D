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
 * @author Muzer(muzerly@gmail.com), speedok(speedok@gmail.com)
 * @link http://code.google.com/p/jiglibflash
 */

 
(function(jigLib){

	var Vector3D=jigLib.Vector3D;
        var JConfig=jigLib.JConfig;
        var CollPointInfo=jigLib.CollPointInfo;
        var CollisionInfo=jigLib.CollisionInfo;
        var CollisionSystem=jigLib.CollisionSystem;
        var ContactData=jigLib.ContactData;
        var JMatrix3D=jigLib.JMatrix3D;
        var JNumber3D=jigLib.JNumber3D;        var JConstraint=jigLib.JConstraint;        var BodyPair=jigLib.BodyPair;        var CachedImpulse=jigLib.CachedImpulse;
	
	var PhysicsSystem=function(){
		this.setSolverType(JConfig.solverType);
		this._doingIntegration = false;
		this._bodies = [];
                this._collisions = [];
                this._activeBodies = [];
		this._constraints = [];
		this._controllers = [];

		this._cachedContacts = [];
		this._collisionSystem = new CollisionSystem();

		this.setGravity(JNumber3D.getScaleVector(Vector3D.Y_AXIS, -10));
	}
	
	PhysicsSystem.prototype._currentPhysicsSystem=null;

	PhysicsSystem.prototype._maxVelMag = 0.5;
	PhysicsSystem.prototype._minVelForProcessing = 0.001;

	PhysicsSystem.prototype._bodies = null;
	PhysicsSystem.prototype._activeBodies=null;
	PhysicsSystem.prototype._collisions=null;
	PhysicsSystem.prototype._constraints=null;
	PhysicsSystem.prototype._controllers=null;

	PhysicsSystem.prototype._gravityAxis=null;
	PhysicsSystem.prototype._gravity=null;

	PhysicsSystem.prototype._doingIntegration=null;

	PhysicsSystem.prototype.preProcessCollisionFn=function(){};
	PhysicsSystem.prototype.preProcessContactFn=function(){};
	PhysicsSystem.prototype.processCollisionFn=function(){};
	PhysicsSystem.prototype.processContactFn=function(){};

	PhysicsSystem.prototype._cachedContacts=null;
	PhysicsSystem.prototype._collisionSystem=null;
		
	PhysicsSystem.getInstance=function(){
		if (!PhysicsSystem._currentPhysicsSystem){
			PhysicsSystem._currentPhysicsSystem = new PhysicsSystem();
		}
		return PhysicsSystem._currentPhysicsSystem;
	}
	
	PhysicsSystem.prototype.getAllExternalForces=function(dt){
		for(var i=0;i<this._bodies.length;i++){
			this._bodies[i].addExternalForces(dt);
		}

		for(var i=0;i<this._controllers.length;i++){
			this._controllers[i].updateController(dt);
		}
	}

	PhysicsSystem.prototype.getCollisionSystem=function(){
		return _collisionSystem;
	}

	PhysicsSystem.prototype.setGravity=function(gravity){
		this._gravity = gravity;
		if (this._gravity.x == this._gravity.y && this._gravity.y == this._gravity.z){
			this._gravityAxis = -1;
		}
		this._gravityAxis = 0;
		
		if (Math.abs(this._gravity.y) > Math.abs(this._gravity.z)){
			this._gravityAxis = 1;
		}
		if (Math.abs(this._gravity.z) > Math.abs(JNumber3D.toArray(this._gravity)[this._gravityAxis])){
			this._gravityAxis = 2;
		}
	}

	// global gravity acceleration
	PhysicsSystem.prototype.get_gravity=function(){
		return this._gravity;
	}

	PhysicsSystem.prototype.get_gravityAxis=function(){
		return this._gravityAxis;
	}

	PhysicsSystem.prototype.get_bodys=function(){
		return this._bodies;
	}

	// Add a rigid body to the simulation
	PhysicsSystem.prototype.addBody=function(body){
		if (!this.findBody(body)){
			this._bodies.push(body);
			this._collisionSystem.addCollisionBody(body);
		}
	}

	PhysicsSystem.prototype.removeBody=function(body){
		if (this.findBody(body)){
			this._bodies.splice(this._bodies.indexOf(body), 1);
			this._collisionSystem.removeCollisionBody(body);
		}
	}

	PhysicsSystem.prototype.removeAllBodys=function(){
		this._bodies = [];
		this._collisionSystem.removeAllCollisionBodys();
	}

	// Add a constraint to the simulation
	PhysicsSystem.prototype.addConstraint=function(constraint){
		if (!this.findConstraint(constraint)){
			this._constraints.push(constraint);
		}
	}
	
	PhysicsSystem.prototype.removeConstraint=function(constraint){
		if (this.findConstraint(constraint)){
			this._constraints.splice(this._constraints.indexOf(constraint), 1);
		}
	}

	PhysicsSystem.prototype.removeAllConstraints=function(){
		this._constraints = [];
	}

	// Add a physics controlled to the simulation
	PhysicsSystem.prototype.addController=function(controller){
		if (!this.findController(controller)){
			this._controllers.push(controller);
		}
	}

	PhysicsSystem.prototype.removeController=function(controller){
		if (this.findController(controller)){
			this._controllers.splice(this._controllers.indexOf(controller), 1);
		}
	}

	PhysicsSystem.prototype.removeAllControllers=function(){
		this._controllers = [];
	}

	PhysicsSystem.prototype.setSolverType=function(type){
		switch (type)
		{
			case "FAST":
				this.preProcessCollisionFn = this.preProcessCollisionFast;
				this.preProcessContactFn = this.preProcessCollisionFast;
				this.processCollisionFn = this.processCollision;
				this.processContactFn = this.processCollision;
				return;
			case "NORMAL":
				this.preProcessCollisionFn = this.preProcessCollisionNormal;
				this.preProcessContactFn = this.preProcessCollisionNormal;
				this.processCollisionFn = this.processCollision;
				this.processContactFn = this.processCollision;
				return;
			case "ACCUMULATED":
				this.preProcessCollisionFn = this.preProcessCollisionNormal;
				this.preProcessContactFn = this.preProcessCollisionAccumulated;
				this.processCollisionFn = this.processCollision;
				this.processContactFn = this.processCollisionAccumulated;
				return;
			default:
				this.preProcessCollisionFn = this.preProcessCollisionNormal;
				this.preProcessContactFn = this.preProcessCollisionNormal;
				this.processCollisionFn = this.processCollision;
				this.processContactFn = this.processCollision;
				return;
		}
	}

	PhysicsSystem.prototype.findBody=function(body){
		for(var i=0;i<this._bodies.length;i++){
			if(body==this._bodies[i]){
				return true;
			}
		}
		return false;
	}

	PhysicsSystem.prototype.findConstraint=function(constraint){
		for(var i=0;i<this._constraints.length;i++){
			if(constraint==this._constraints[i]){
				return true;
			}
		}
		return false;
	}

	PhysicsSystem.prototype.findController=function(controller){
		for(var i=0;i<this._controllers.length;i++){
			if(controller==this._controllers[i]){
				return true;
			}
		}
		return false;
	}

	// fast-but-inaccurate pre-processor
	PhysicsSystem.prototype.preProcessCollisionFast=function(collision, dt){
		collision.satisfied=false;

		var body0 = collision.objInfo.body0;
		var body1 = collision.objInfo.body1;

		var N = collision.dirToBody;
		var timescale = JConfig.numPenetrationRelaxationTimesteps * dt;
		var approachScale = 0;
		var ptInfo;
		var tempV;
		var ptNum= collision.pointInfo.length;

		if (ptNum > 1){
			var avR0 = new Vector3D();
			var avR1 = new Vector3D();
			var avDepth = 0;

			for (var i = 0; i < ptNum; i++){
				ptInfo = collision.pointInfo[i];
				avR0 = avR0.add(ptInfo.r0);
				avR1 = avR1.add(ptInfo.r1);
				avDepth += ptInfo.initialPenetration;
			}
			avR0 = JNumber3D.getDivideVector(avR0, Number(ptNum));
			avR1 = JNumber3D.getDivideVector(avR1, Number(ptNum));
			avDepth /= ptNum;

			collision.pointInfo = [];
			collision.pointInfo[0] = new CollPointInfo();
			collision.pointInfo[0].r0 = avR0;
			collision.pointInfo[0].r1 = avR1;
			collision.pointInfo[0].initialPenetration = avDepth;
		}

		var len = collision.pointInfo.length;
		for (i = 0; i < len; i++){
			ptInfo = collision.pointInfo[i];
			if (!body0.get_movable()){
				ptInfo.denominator = 0;
			}else{
				tempV = ptInfo.r0.crossProduct(N);
				JMatrix3D.multiplyVector(body0.get_worldInvInertia(), tempV);
				ptInfo.denominator = body0.get_invMass() + N.dotProduct(tempV.crossProduct(ptInfo.r0));
			}
			if (body1.get_movable()){
				tempV = ptInfo.r1.crossProduct(N);
				JMatrix3D.multiplyVector(body1.get_worldInvInertia(), tempV);
				ptInfo.denominator += (body1.get_invMass() + N.dotProduct(tempV.crossProduct(ptInfo.r1)));
			}
			if (ptInfo.denominator < JNumber3D.NUM_TINY){
				ptInfo.denominator = JNumber3D.NUM_TINY;
			}

			if (ptInfo.initialPenetration > JConfig.allowedPenetration){
				ptInfo.minSeparationVel = (ptInfo.initialPenetration - JConfig.allowedPenetration) / timescale;
			}else{
				approachScale = -0.1 * (ptInfo.initialPenetration - JConfig.allowedPenetration) / JConfig.allowedPenetration;
				if (approachScale < JNumber3D.NUM_TINY){
					approachScale = JNumber3D.NUM_TINY;
				}else if (approachScale > 1){
					approachScale = 1;
				}
				ptInfo.minSeparationVel = approachScale * (ptInfo.initialPenetration - JConfig.allowedPenetration) / Math.max(dt, JNumber3D.NUM_TINY);
			}
			if (ptInfo.minSeparationVel > this._maxVelMag){
				ptInfo.minSeparationVel = this._maxVelMag;
			}
		}
	}

	// Special pre-processor for the normal solver
	PhysicsSystem.prototype.preProcessCollisionNormal=function(collision, dt){
		collision.satisfied = false;

		var body0 = collision.objInfo.body0;
		var body1 = collision.objInfo.body1;

		var N = collision.dirToBody;
		var timescale= JConfig.numPenetrationRelaxationTimesteps * dt;
		var approachScale = 0;
		var ptInfo;
		var tempV;
		var len= collision.pointInfo.length;
		for (var i = 0; i < len; i++){
			ptInfo = collision.pointInfo[i];
			if (!body0.get_movable()){
				ptInfo.denominator = 0;
			}else{
				tempV = ptInfo.r0.crossProduct(N);
				JMatrix3D.multiplyVector(body0.get_worldInvInertia(), tempV);
				ptInfo.denominator = body0.get_invMass() + N.dotProduct(tempV.crossProduct(ptInfo.r0));
			}

			if (body1.get_movable()){
				tempV = ptInfo.r1.crossProduct(N);
				JMatrix3D.multiplyVector(body1.get_worldInvInertia(), tempV);
				ptInfo.denominator += (body1.get_invMass() + N.dotProduct(tempV.crossProduct(ptInfo.r1)));
			}
			if (ptInfo.denominator < JNumber3D.NUM_TINY){
				ptInfo.denominator = JNumber3D.NUM_TINY;
			}
			if (ptInfo.initialPenetration > JConfig.allowedPenetration){
				ptInfo.minSeparationVel = (ptInfo.initialPenetration - JConfig.allowedPenetration) / timescale;
			}else{
				approachScale = -0.1 * (ptInfo.initialPenetration - JConfig.allowedPenetration) / JConfig.allowedPenetration;
				if (approachScale < JNumber3D.NUM_TINY){
					approachScale = JNumber3D.NUM_TINY;
				}else if (approachScale > 1){
					approachScale = 1;
				}
				ptInfo.minSeparationVel = approachScale * (ptInfo.initialPenetration - JConfig.allowedPenetration) / Math.max(dt, JNumber3D.NUM_TINY);
			}
			if (ptInfo.minSeparationVel > this._maxVelMag){
				ptInfo.minSeparationVel = this._maxVelMag;
			}
		}

	}

	// Special pre-processor for the accumulated solver
	PhysicsSystem.prototype.preProcessCollisionAccumulated=function(collision, dt){
		collision.satisfied = false;
		var body0 = collision.objInfo.body0;
		var body1 = collision.objInfo.body1;

		var N = collision.dirToBody;
		var timescale = JConfig.numPenetrationRelaxationTimesteps * dt;

		var tempV;
		var ptInfo;
		var approachScale = 0;
		var numTiny = JNumber3D.NUM_TINY;
		var allowedPenetration = JConfig.allowedPenetration;

		var len = collision.pointInfo.length;
		for (var i = 0; i < len; i++){
			ptInfo = collision.pointInfo[i];
			if (!body0.get_movable()){
				ptInfo.denominator = 0;
			}else{
				tempV = ptInfo.r0.crossProduct(N);
				JMatrix3D.multiplyVector(body0.get_worldInvInertia(), tempV);
				ptInfo.denominator = body0.get_invMass() + N.dotProduct(tempV.crossProduct(ptInfo.r0));
			}

			if (body1.get_movable()){
				tempV = ptInfo.r1.crossProduct(N);
				JMatrix3D.multiplyVector(body1.get_worldInvInertia(), tempV);
				ptInfo.denominator += (body1.get_invMass() + N.dotProduct(tempV.crossProduct(ptInfo.r1)));
			}
			if (ptInfo.denominator < numTiny){
				ptInfo.denominator = numTiny;
			}
			if (ptInfo.initialPenetration > allowedPenetration){
				ptInfo.minSeparationVel = (ptInfo.initialPenetration -allowedPenetration) / timescale;
			}else{
				approachScale = -0.1 * (ptInfo.initialPenetration - allowedPenetration) / allowedPenetration;
				if (approachScale < numTiny){
					approachScale = numTiny;
				}else if (approachScale > 1){
					approachScale = 1;
				}
				ptInfo.minSeparationVel = approachScale * (ptInfo.initialPenetration - allowedPenetration) / Math.max(dt, numTiny);
			}

			ptInfo.accumulatedNormalImpulse = 0;
			ptInfo.accumulatedNormalImpulseAux = 0;
			ptInfo.accumulatedFrictionImpulse = new Vector3D();

			var bestDistSq = 0.04;
			var bp = new BodyPair(body0, body1, new Vector3D(), new Vector3D());

			for(var j=0;j<this._cachedContacts.length;j++){
				if (!(bp.body0 == this._cachedContacts[j].pair.body0 && bp.body1 == this._cachedContacts[j].pair.body1)){
					continue;
				}
				var distSq = (this._cachedContacts[j].pair.body0 == body0) ? this._cachedContacts[j].pair.r.subtract(ptInfo.r0).lengthSquared : this._cachedContacts[j].pair.r.subtract(ptInfo.r1).lengthSquared;

				if (distSq < bestDistSq){
					bestDistSq = distSq;
					ptInfo.accumulatedNormalImpulse = this._cachedContacts[j].impulse.normalImpulse;
					ptInfo.accumulatedNormalImpulseAux = this._cachedContacts[j].impulse.normalImpulseAux;
					ptInfo.accumulatedFrictionImpulse = this._cachedContacts[j].impulse.frictionImpulse;
					if (this._cachedContacts[j].pair.body0 != body0){
						ptInfo.accumulatedFrictionImpulse = JNumber3D.getScaleVector(ptInfo.accumulatedFrictionImpulse, -1);
					}
				}
			}

			if (ptInfo.accumulatedNormalImpulse != 0){
				var impulse = JNumber3D.getScaleVector(N, ptInfo.accumulatedNormalImpulse);
				impulse = impulse.add(ptInfo.accumulatedFrictionImpulse);
				body0.applyBodyWorldImpulse(impulse, ptInfo.r0);
				body1.applyBodyWorldImpulse(JNumber3D.getScaleVector(impulse, -1), ptInfo.r1);
			}
			if (ptInfo.accumulatedNormalImpulseAux != 0){
				impulse = JNumber3D.getScaleVector(N, ptInfo.accumulatedNormalImpulseAux);
				body0.applyBodyWorldImpulseAux(impulse, ptInfo.r0);
				body1.applyBodyWorldImpulseAux(JNumber3D.getScaleVector(impulse, -1), ptInfo.r1);
			}
		}
	}
	
	/* Handle an individual collision by classifying it, calculating
	impulse, applying impulse and updating the velocities of the
	objects. Allows over-riding of the elasticity. Ret val indicates
	if an impulse was applied
	*/
	PhysicsSystem.prototype.processCollision=function(collision, dt){
		collision.satisfied = true;

		var body0= collision.objInfo.body0;
		var body1 = collision.objInfo.body1;

		var gotOne = false;
		var N = collision.dirToBody;

		var deltaVel = 0;
		var normalVel = 0;
		var finalNormalVel = 0;
		var normalImpulse= 0;
		var impulse;
		var Vr0;
		var Vr1;
		var ptInfo;
		
		var len = collision.pointInfo.length;
		for (var i = 0; i < len; i++){
			ptInfo = collision.pointInfo[i];

			Vr0 = body0.getVelocity(ptInfo.r0);
			Vr1 = body1.getVelocity(ptInfo.r1);
			
			normalVel = Vr0.subtract(Vr1).dotProduct(N);
			if (normalVel > ptInfo.minSeparationVel){
				continue;
			}
			finalNormalVel = -1 * collision.mat.get_restitution() * normalVel;
			if (finalNormalVel < this._minVelForProcessing){
				finalNormalVel = ptInfo.minSeparationVel;
			}
			deltaVel = finalNormalVel - normalVel;
			if (deltaVel <= this._minVelForProcessing){
				continue;
			}
			
			normalImpulse = deltaVel / ptInfo.denominator;
			
			gotOne = true;
			impulse = JNumber3D.getScaleVector(N, normalImpulse);
			
			body0.applyBodyWorldImpulse(impulse, ptInfo.r0);
			body1.applyBodyWorldImpulse(JNumber3D.getScaleVector(impulse, -1), ptInfo.r1);

			var tempV;
			var VR = Vr0.subtract(Vr1);
			var tangent_vel = VR.subtract(JNumber3D.getScaleVector(N, VR.dotProduct(N)));
			var tangent_speed = tangent_vel.get_length();

			if (tangent_speed > this._minVelForProcessing){
				var T = JNumber3D.getScaleVector(JNumber3D.getDivideVector(tangent_vel, tangent_speed), -1);
				var denominator = 0;

				if (body0.get_movable()){
					tempV = ptInfo.r0.crossProduct(T);
					JMatrix3D.multiplyVector(body0.get_worldInvInertia(), tempV);
					denominator = body0.get_invMass() + T.dotProduct(tempV.crossProduct(ptInfo.r0));
				}

				if (body1.get_movable()){
					tempV = ptInfo.r1.crossProduct(T);
					JMatrix3D.multiplyVector(body1.get_worldInvInertia(), tempV);
					denominator += (body1.get_invMass() + T.dotProduct(tempV.crossProduct(ptInfo.r1)));
				}

				if (denominator > JNumber3D.NUM_TINY){
					var impulseToReverse = Math.pow(collision.mat.get_friction(), 3) * tangent_speed / denominator;

					T = JNumber3D.getScaleVector(T, impulseToReverse);
					body0.applyBodyWorldImpulse(T, ptInfo.r0);
					body1.applyBodyWorldImpulse(JNumber3D.getScaleVector(T, -1), ptInfo.r1);
				}
			}
		}

		if (gotOne){
			body0.setConstraintsAndCollisionsUnsatisfied();
			body1.setConstraintsAndCollisionsUnsatisfied();
		}
		return gotOne;
	}

	// Accumulated and clamp impulses
	PhysicsSystem.prototype.processCollisionAccumulated=function(collision, dt){
		collision.satisfied = true;
		var gotOne = false;
		var N = collision.dirToBody;
		var body0 = collision.objInfo.body0;
		var body1 = collision.objInfo.body1;

		var deltaVel = 0;
		var normalVel = 0;
		var normalImpulse = 0;
		var impulse;
		var Vr0;
		var Vr1;
		var ptInfo;
		
		var len = collision.pointInfo.length;
		for (var i = 0; i < len; i++){
			ptInfo = collision.pointInfo[i];

			Vr0 = body0.getVelocity(ptInfo.r0);
			Vr1 = body1.getVelocity(ptInfo.r1);
			normalVel = Vr0.subtract(Vr1).dotProduct(N);
		
			deltaVel = -normalVel;
			if (ptInfo.minSeparationVel < 0){
				deltaVel += ptInfo.minSeparationVel;
			}
			
			if (Math.abs(deltaVel) > this._minVelForProcessing){
				normalImpulse = deltaVel / ptInfo.denominator;
				var origAccumulatedNormalImpulse = ptInfo.accumulatedNormalImpulse;
				ptInfo.accumulatedNormalImpulse = Math.max(ptInfo.accumulatedNormalImpulse + normalImpulse, 0);
				var actualImpulse = ptInfo.accumulatedNormalImpulse - origAccumulatedNormalImpulse;

				impulse = JNumber3D.getScaleVector(N, actualImpulse);
				body0.applyBodyWorldImpulse(impulse, ptInfo.r0);
				body1.applyBodyWorldImpulse(JNumber3D.getScaleVector(impulse, -1), ptInfo.r1);

				gotOne = true;
			}

			Vr0 = body0.getVelocityAux(ptInfo.r0);
			Vr1 = body1.getVelocityAux(ptInfo.r1);
			normalVel = Vr0.subtract(Vr1).dotProduct(N);

			deltaVel = -normalVel;
			if (ptInfo.minSeparationVel > 0){
				deltaVel += ptInfo.minSeparationVel;
			}
			if (Math.abs(deltaVel) > this._minVelForProcessing){
				normalImpulse = deltaVel / ptInfo.denominator;
				origAccumulatedNormalImpulse = ptInfo.accumulatedNormalImpulseAux;
				ptInfo.accumulatedNormalImpulseAux = Math.max(ptInfo.accumulatedNormalImpulseAux + normalImpulse, 0);
				actualImpulse = ptInfo.accumulatedNormalImpulseAux - origAccumulatedNormalImpulse;

				impulse = JNumber3D.getScaleVector(N, actualImpulse);
				body0.applyBodyWorldImpulseAux(impulse, ptInfo.r0);
				body1.applyBodyWorldImpulseAux(JNumber3D.getScaleVector(impulse, -1), ptInfo.r1);

				gotOne = true;
			}

			if (ptInfo.accumulatedNormalImpulse > 0){
				Vr0 = body0.getVelocity(ptInfo.r0);
				Vr1 = body1.getVelocity(ptInfo.r1);
				var tempV;
				var VR = Vr0.subtract(Vr1);
				var tangent_vel = VR.subtract(JNumber3D.getScaleVector(N, VR.dotProduct(N)));
				var tangent_speed = tangent_vel.length;
				if (tangent_speed > this._minVelForProcessing){

					var T= JNumber3D.getScaleVector(JNumber3D.getDivideVector(tangent_vel, tangent_speed), -1);
					var denominator = 0;
					if (body0.get_movable()){
						tempV = ptInfo.r0.crossProduct(T);
						JMatrix3D.multiplyVector(body0.get_worldInvInertia(), tempV);
						denominator = body0.invMass + T.dotProduct(tempV.crossProduct(ptInfo.r0));
					}
					if (body1.get_movable()){
						tempV = ptInfo.r1.crossProduct(T);
						JMatrix3D.multiplyVector(body1.get_worldInvInertia(), tempV);
						denominator += (body1.invMass + T.dotProduct(tempV.crossProduct(ptInfo.r1)));
					}
					if (denominator > JNumber3D.NUM_TINY){
						var impulseToReverse = tangent_speed / denominator;
						var frictionImpulseVec = JNumber3D.getScaleVector(T, impulseToReverse);

						var origAccumulatedFrictionImpulse = ptInfo.accumulatedFrictionImpulse.clone();
						ptInfo.accumulatedFrictionImpulse = ptInfo.accumulatedFrictionImpulse.add(frictionImpulseVec);

						var AFIMag = ptInfo.accumulatedFrictionImpulse.length;
						var maxAllowedAFIMag = collision.mat.friction * ptInfo.accumulatedNormalImpulse;

						if (AFIMag > JNumber3D.NUM_TINY && AFIMag > maxAllowedAFIMag){
							ptInfo.accumulatedFrictionImpulse = JNumber3D.getScaleVector(ptInfo.accumulatedFrictionImpulse, maxAllowedAFIMag / AFIMag);
						}

						var actualFrictionImpulse = ptInfo.accumulatedFrictionImpulse.subtract(origAccumulatedFrictionImpulse);

						body0.applyBodyWorldImpulse(actualFrictionImpulse, ptInfo.r0);
						body1.applyBodyWorldImpulse(JNumber3D.getScaleVector(actualFrictionImpulse, -1), ptInfo.r1);
					}
				}
			}
		}
		if (gotOne)
		{
			body0.setConstraintsAndCollisionsUnsatisfied();
			body1.setConstraintsAndCollisionsUnsatisfied();
		}
		return gotOne;
	}
	
	PhysicsSystem.prototype.updateContactCache=function(){
		this._cachedContacts = [];
		var ptInfo;
		var fricImpulse;
		var contact;
		for(var i=0;i<this._collisions.length;i++){			var collInfo=this._collisions[i];
			for (var j in this._collisions[i].pointInfo){
				ptInfo = this._collisions[i].pointInfo[j];
				fricImpulse = (collInfo.objInfo.body0.id > collInfo.objInfo.body1.id) ? ptInfo.accumulatedFrictionImpulse : JNumber3D.getScaleVector(ptInfo.accumulatedFrictionImpulse, -1);

				contact = new ContactData();
				contact.pair = new BodyPair(collInfo.objInfo.body0, collInfo.objInfo.body1, ptInfo.r0, ptInfo.r1);
				contact.impulse = new CachedImpulse(ptInfo.accumulatedNormalImpulse, ptInfo.accumulatedNormalImpulseAux, ptInfo.accumulatedFrictionImpulse);

				this._cachedContacts.push(contact);
			}
		}
	}

	PhysicsSystem.prototype.handleAllConstraints=function(dt, iter, forceInelastic){
		var origNumCollisions = this._collisions.length;
		var collInfo;
		var _constraint;
		for(var i=0;i<this._constraints.length;i++){
                        this._constraints[i].preApply(dt);
		}

		if (forceInelastic){
			for(var i=0;i<this._collisions.length;i++){
				this.preProcessContactFn(this._collisions[i], dt);
				this._collisions[i].mat.set_restitution(0);
				this._collisions[i].satisfied=false;
			}
		}else{
			for(var i=0;i<this._collisions.length;i++){
				this.preProcessCollisionFn(this._collisions[i], dt);
			}
		}

		var flag;
		var gotOne;
		var len;
		for (var step = 0; step < iter; step++){
			gotOne = false;

			for(var i=0;i<this._collisions.length;i++){
				collInfo=this._collisions[i]
				if (!collInfo.satisfied){
					if (forceInelastic){
						flag = this.processContactFn(collInfo, dt);
						gotOne = gotOne || flag;
					}else{
						flag = this.processCollisionFn(collInfo, dt);
						gotOne = gotOne || flag;
					}
				}
			}
			for(var i=0;i<this._constraints.length;i++){
				var _constraint=this._constraints[i];
				if (!_constraint.get_satisfied()){
					flag = _constraint.apply(dt);
					gotOne = gotOne || flag;
				}
			}
			this.tryToActivateAllFrozenObjects();

			if (forceInelastic){
				len = this._collisions.length;
				for (var j = origNumCollisions; j < len; j++){
					this._collisions[j].mat.set_restitution(0);
					this._collisions[j].satisfied=false;
					this.preProcessContactFn(this._collisions[j], dt);
				}
			}else{
				len = this._collisions.length;
				for (j = origNumCollisions; j < len; j++){
					this.preProcessCollisionFn(this._collisions[j], dt);
				}
			}
			origNumCollisions = this._collisions.length;
			if (!gotOne){
				break;
			}
		}
	}
	
	PhysicsSystem.prototype.activateObject=function(body){
		if (!body.get_movable() || body.isActive){
			return;
		}
		body.setActive();
		this._activeBodies.push(body);
		var orig_num = this._collisions.length;
		this._collisionSystem.detectCollisions(body, this._collisions);
		var other_body;
		var thisBody_normal;
		var len = this._collisions.length;
		for (var i = orig_num; i < len; i++){
			other_body = this._collisions[i].objInfo.body0;
			thisBody_normal = this._collisions[i].dirToBody;
			if (other_body == body){
				other_body = this._collisions[i].objInfo.body1;
				thisBody_normal = JNumber3D.getScaleVector(this._collisions[i].dirToBody, -1);
			}
			if (!other_body.isActive && other_body.get_force().dotProduct(thisBody_normal) < -JNumber3D.NUM_TINY){
				this.activateObject(other_body);
			}
		}
	}

	PhysicsSystem.prototype.dampAllActiveBodies=function(){
		for(var i=0;i<this._activeBodies.length;i++){
			_activeBody=this._activeBodies[i];
			_activeBody.dampForDeactivation();
                }
	}

	PhysicsSystem.prototype.tryToActivateAllFrozenObjects=function(){
		for(var i=0;i<this._bodies.length;i++){
			var _body=this._bodies[i]
			if (!_body.isActive){
				if (_body.getShouldBeActive()){
					this.activateObject(_body);
				}else{
					if (_body.getVelChanged()){
						_body.setVelocity(new Vector3D());
						_body.setAngVel(new Vector3D());
						_body.clearVelChanged();
					}
				}
			}	
		}
	}

	PhysicsSystem.prototype.activateAllFrozenObjectsLeftHanging=function(){
		var other_body;
                for(var i=0;i<this._bodies.length;i++){
			var _body=this._bodies[i]
			if (_body.isActive){
				_body.doMovementActivations();
				if (_body.collisions.length > 0){
					for (var j in _body.collisions){
						other_body = _body.collisions[j].objInfo.body0;
						if (other_body == _body){
							other_body = _body.collisions[j].objInfo.body1;
						}

						if (!other_body.isActive){							_body.addMovementActivation(_body.get_currentState().position, other_body);
						}
					}
				}
			}
		}
	}

	PhysicsSystem.prototype.updateAllVelocities=function(dt){
		for(var i=0;i<this._activeBodies.length;i++){
			_activeBody=this._activeBodies[i];
			_activeBody.updateVelocity(dt);
		}
	}

	PhysicsSystem.prototype.updateAllPositions=function(dt){
		for(var i=0;i<this._activeBodies.length;i++){
			_activeBody=this._activeBodies[i];
			_activeBody.updatePositionWithAux(dt);
		}
	}

	PhysicsSystem.prototype.notifyAllPostPhysics=function(dt){
                for(var i=0;i<this._bodies.length;i++){
			_body=this._bodies[i];
			_body.postPhysics(dt);
		}
	}

	PhysicsSystem.prototype.updateAllObject3D=function(){
		for(var i=0;i<this._bodies.length;i++){
			_body=this._bodies[i];
			_body.updateObject3D();
		}
	}

	PhysicsSystem.prototype.limitAllVelocities=function(){
		for(var i=0;i<this._activeBodies.length;i++){
			_activeBody=this._activeBodies[i];
			_activeBody.limitVel();
			_activeBody.limitAngVel();
		}
	}

	PhysicsSystem.prototype.tryToFreezeAllObjects=function(dt){
		for(var i=0;i<this._activeBodies.length;i++){
			_activeBody=this._activeBodies[i];
			_activeBody.tryToFreeze(dt);
		}
	}

	PhysicsSystem.prototype.detectAllCollisions=function(dt){
		for(var i=0;i<this._activeBodies.length;i++){
			_activeBody=this._activeBodies[i];
			_activeBody.storeState();
		}
		
		this.updateAllVelocities(dt);
		this.updateAllPositions(dt);

		for(var i=0;i<this._bodies.length;i++){
			_body=this._bodies[i];
			_body.collisions = [];
		}
			
		this._collisions = [];
		this._collisionSystem.detectAllCollisions(this._activeBodies, this._collisions);

		for(var i=0;i<this._activeBodies.length;i++){
			_activeBody=this._activeBodies[i];
			_activeBody.restoreState();
		}
	}

	PhysicsSystem.prototype.copyAllCurrentStatesToOld=function(){
		for(var i=0;i<this._bodies.length;i++){
			_body=this._bodies[i];
			if (_body.isActive || _body.getVelChanged()){
				_body.copyCurrentStateToOld();
			}
		}
	}

	PhysicsSystem.prototype.findAllActiveBodies=function(){
		this._activeBodies = [];
                
		for(var i=0;i<this._bodies.length;i++){
			var _body=this._bodies[i];			if (_body.isActive){
				this._activeBodies.push(_body);
			}
		}
	}

	// Integrates the system forwards by dt - the caller is
	// responsible for making sure that repeated calls to this use
	// the same dt (if desired)
	PhysicsSystem.prototype.integrate=function(dt){
		this._doingIntegration = true;

		this.findAllActiveBodies();
		this.copyAllCurrentStatesToOld();

		this.getAllExternalForces(dt);
		this.detectAllCollisions(dt);
		this.handleAllConstraints(dt, JConfig.numCollisionIterations, false);
		this.updateAllVelocities(dt);
		this.handleAllConstraints(dt, JConfig.numContactIterations, true);

		this.dampAllActiveBodies();
		this.tryToFreezeAllObjects(dt);
		this.activateAllFrozenObjectsLeftHanging();

		this.limitAllVelocities();

		this.updateAllPositions(dt);
		this.notifyAllPostPhysics(dt);

		this.updateAllObject3D();
		if (JConfig.solverType == "ACCUMULATED"){
			this.updateContactCache();
		}
		for(var i=0;i<this._bodies.length;i++){
			_body=this._bodies[i];
			_body.clearForces();
		}

		this._doingIntegration = false;
	}
	
	jigLib.PhysicsSystem=PhysicsSystem;
	
})(jigLib)
