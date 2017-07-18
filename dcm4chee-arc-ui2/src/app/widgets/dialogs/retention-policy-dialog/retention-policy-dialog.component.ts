import { Component } from '@angular/core';
import {MdDialogRef} from "@angular/material";

@Component({
  selector: 'app-retention-policy-dialog',
  templateUrl: './retention-policy-dialog.component.html'
})
export class RetentionPolicyDialogComponent {

    private _title;
    private _formObj;
    private _currentValueState;
    private _validForm;
    constructor(public dialogRef: MdDialogRef<RetentionPolicyDialogComponent>) {
        this._validForm = true;
    }

    get formObj() {
        return this._formObj;
    }

    set formObj(value) {
        this._formObj = value;
    }

    get title() {
        return this._title;
    }

    set title(value) {
        this._title = value;
    }

    save(){
        console.log("form",this._formObj);
        this.dialogRef.close(this._currentValueState);
    }
    submitFunction(form){
        console.log("in submit",form);
        this.dialogRef.close(form);
        // this._currentValueState = form;
        // this._validForm = form.valid;
    }
/*    onChange(form){
        console.log("in on change",form);
        this._currentValueState = form;
        this._validForm = form.valid;
    }*/
    get currentValueState() {
        return this._currentValueState;
    }

    set currentValueState(value) {
        this._currentValueState = value;
    }

    get validForm() {
        return this._validForm;
    }

    set validForm(value) {
        this._validForm = value;
    }
}
