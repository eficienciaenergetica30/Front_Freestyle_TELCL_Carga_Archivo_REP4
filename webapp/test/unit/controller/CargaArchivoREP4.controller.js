/*global QUnit*/

sap.ui.define([
	"cargaarchivorep4/controller/CargaArchivoREP4.controller"
], function (Controller) {
	"use strict";

	QUnit.module("CargaArchivoREP4 Controller");

	QUnit.test("I should test the CargaArchivoREP4 controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
