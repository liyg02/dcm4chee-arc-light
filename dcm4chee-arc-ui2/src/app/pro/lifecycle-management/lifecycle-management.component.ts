import {Component, OnInit, ViewContainerRef} from '@angular/core';
import * as _ from 'lodash';
import {LifecycleManagementService} from "./lifecycle-management.service";
import {ConfirmComponent} from "../../widgets/dialogs/confirm/confirm.component";
import {MdDialogConfig, MdDialog, MdDialogRef} from "@angular/material";
import {DeviceConfiguratorService} from "../../device-configurator/device-configurator.service";
import {AppService} from "../../app.service";
import {DatePipe} from "@angular/common";
import {Globalvar} from "../../constants/globalvar";
import {RetentionPolicyDialogComponent} from "../../widgets/dialogs/retention-policy-dialog/retention-policy-dialog.component";
import {ControlService} from "../../control/control.service";
import {SlimLoadingBarService} from "ng2-slim-loading-bar";


@Component({
  selector: 'app-lifecycle-management',
  templateUrl: './lifecycle-management.component.html'
})
export class LifecycleManagementComponent implements OnInit {
    filters = {
        ExporterID: undefined,
        offset: undefined,
        limit: 20,
        StudyUID: undefined,
        updatedBefore: undefined,
        dicomDeviceName: undefined,
        AccessionNumber:undefined,
        PatientName:undefined,
        fuzzymatching:undefined,
        PatientID:undefined,
        IssuerOfPatientID:undefined,
        StudyDescription:undefined,
        StudyInstanceUID:undefined,
        LocalNamespaceEntityID:undefined,
        'ScheduledProcedureStepSequence.ScheduledStationAETitle':undefined,
        ReferringPhysicianName:undefined,
        ModalitiesInStudy:undefined,
        StudyDate:undefined,
        StudyTime:undefined,
        SeriesDescription:undefined,
        StudyID:undefined,
        BodyPartExamined:undefined,
        SOPClassesInStudy:undefined,
        SendingApplicationEntityTitleOfSeries:undefined,
        InstitutionalDepartmentName:undefined,
        StationName:undefined,
        InstitutionName:undefined,
        retrievefailed:undefined,
    };
    _ = _;
    aes;
    aet;
    aets;
    aet1;
    aet2;
    homeAet;
    advancedConfig = false;
    diff;
    count;
    groupResults = {};
    disabled = {
        IssuerOfPatientID:false,
        LocalNamespaceEntityID:false
    };
    diffAttributes;
    modalities;
    moreFunctionsButtons = false;
    showModalitySelector;
    StudyReceiveDateTime = {
        from: undefined,
        to: undefined
    };
    studyDate: any = { from: this.getTodayDate(), to: this.getTodayDate(), toObject: new Date(), fromObject: new Date()};
    studyTime: any = { from: '', to: ''};
    groups;
    groupObject;
    Object = Object;
    toggle = '';
    getTodayDate() {
        let todayDate = new Date();
        return this.datePipe.transform(todayDate, 'yyyyMMdd');
    }
    schema = {
        "title": "Study Retention Policy",
        "description": "Study Retention Policy",
        "type": "object",
        "required": [
            "cn",
            "dcmRetentionPeriod",
            "dcmRulePriority",
            "dcmExpireSeriesIndividually"
        ],
        "properties": {
            "cn": {
                "title": "Name",
                "description": "Arbitrary/Meaningful name of the Study Retention Policy",
                "type": "string"
            },
            "dcmRetentionPeriod": {
                "title": "Study Retention Period",
                "description": "Study Retention Period in ISO-8601 period format PnYnMnD or PnW",
                "type": "string",
                "format": "dcmPeriod"
            },
            "dcmRulePriority": {
                "title": "Rule Priority",
                "description": "Rule Priority.",
                "type": "integer",
                "minimum": 0,
                "default": 0
            },
            "dcmProperty": {
                "title": "Property",
                "description": "Property in format <name>=<value>",
                "type": "array",
                "items": {
                    "type": "string"
                }
            },
            "dcmExpireSeriesIndividually": {
                "title": "Expire Series Individually",
                "description": "Indicates if series should be expired individually or not.",
                "type": "boolean",
                "default": false
            }
        }
    };
    formObj;
    model = {};
    table = [
        {
            title:"&nbsp;",
            code:"menu",
            widthWeight:0.6,
            calculatedWidth:"20%"
        },{
            title:"Patient's Name",
            code:"00100010",
            description:"Patient's Name",
            widthWeight:1,
            calculatedWidth:"20%"
        },{
            title:"Patient ID",
            code:"00100020",
            description:"Patient ID",
            widthWeight:1,
            calculatedWidth:"20%"
        },{
            title:"Birth Date",
            code:"00100030",
            description:"Patient's Birth Date",
            widthWeight:1,
            calculatedWidth:"20%"
        },{
            title:"Sex",
            code:"00100040",
            description:"Patient's Sex",
            widthWeight:0.2,
            calculatedWidth:"20%"
        },{
            title:"Issuer of PID",
            code:"00100021",
            description:"Issuer of Patient ID",
            widthWeight:1,
            calculatedWidth:"20%"
        },
        {
            title:"Study ID",
            code:"00200010",
            description:"Study ID",
            widthWeight:1,
            calculatedWidth:"20%"
        },{
            title:"Acc. Nr.",
            code:"00080050",
            description:"Accession Number",
            widthWeight:1,
            calculatedWidth:"20%"
        },
        {
            title:"Modality",
            code:"00080061",
            description:"Modalities in Study",
            widthWeight:0.6,
            calculatedWidth:"20%"
        },{
            title:"Expiration Date",
            code:"77771023",
            description:"Study Expiration Date",
            widthWeight:0.6,
            calculatedWidth:"20%"
        },
        {
            title:"#S",
            code:"00201206",
            description:"Number of Study Related Series",
            widthWeight:0.2,
            calculatedWidth:"20%"
        },
        {
            title:"#I",
            code:"00201208",
            description:"Number of Study Related Instances",
            widthWeight:0.2,
            calculatedWidth:"20%"
        }
    ];
    retentionPolicyTable = [
        {
            title:"&nbsp;",
            code:"menu",
            widthWeight:0.2,
            calculatedWidth:"20%"
        },
        {
            title:"Name",
            code:"cn",
            description:"Name of the Study Retention Policy",
            widthWeight:1,
            calculatedWidth:"20%"
        },
        {
            title:"Retention Period",
            code:"dcmRetentionPeriod",
            description:"Period of the Retention Policy",
            widthWeight:1,
            calculatedWidth:"20%"
        },
        {
            title:"Properties",
            code:"dcmProperty",
            description:"Properties of Retention Policy",
            widthWeight:3,
            calculatedWidth:"20%"
        }
    ];
    expiredStudies;
    allStudies;
    archiveDevice;
    StudyRetentionPolicy;
    ExternalRetrieveAETchecked;
    retentionPolicyArchiveDevicePath = "dcmArchiveDevice.dcmStudyRetentionPolicy";
    dialogRef: MdDialogRef<any>;
    constructor(
        private service:LifecycleManagementService,
        public viewContainerRef: ViewContainerRef ,
        public dialog: MdDialog,
        public config: MdDialogConfig,
        public deviceConfigService:DeviceConfiguratorService,
        public mainservice:AppService,
        private datePipe:DatePipe,
        private controlService: ControlService,
        public cfpLoadingBar: SlimLoadingBarService
    ) { }

    ngOnInit() {
        this.getAets(2);
        this.calculateWidthOfTable('table');
        this.calculateWidthOfTable('retentionPolicyTable');
        // this.getArchiveDevice();
        this.getArchiveDevice(4);
        this.formObj = this.deviceConfigService.convertSchemaToForm({}, this.schema, {});
        this.modalities = Globalvar.MODALITIES;
    };

    selectModality(key){
        this.filters.ModalitiesInStudy = key;
        // this.filters['ScheduledProcedureStepSequence.Modality'] = key;
        $('.Modality').show();
        this.showModalitySelector = false;
    };
    conditionWarning($event, condition, msg){
        let id = $event.currentTarget.id;
        let $this = this;
        if (condition){
            this.disabled[id] = true;
            this.mainservice.setMessage({
                'title': 'Warning',
                'text': msg,
                'status': 'warning'
            });
            setTimeout(function() {
                $this.disabled[id] = false;
            }, 100);
        }
    };
    addRetentionPolicy(){
        this.modifyetentionPolicy(null,null, 'new');
    }
    editRetentionPolicy(retention,index){
        this.modifyetentionPolicy(retention,index, 'edit');
    }
    modifyetentionPolicy(retention,index, mode){
        let $this = this;
        let modalTitle = "Edit Study Retention Policy";
        if(mode === "new"){
            modalTitle = "Add new Study Retention Policy";
        }
        this.dialogRef = this.dialog.open(RetentionPolicyDialogComponent, {
            height: 'auto',
            width: '80%'
        });
        this.dialogRef.componentInstance.title = modalTitle;
        this.dialogRef.componentInstance.formObj = this.deviceConfigService.convertSchemaToForm(retention, this.schema, {});
        this.dialogRef.afterClosed().subscribe(
            (newRetentionObject)=>{
                if(newRetentionObject){
                    $this.cfpLoadingBar.start();
                    if(_.hasIn($this.archiveDevice,"dicomDeviceName") && $this.archiveDevice.dicomDeviceName != ''){
                        if(mode === "new"){
                            if(_.hasIn($this.archiveDevice,$this.retentionPolicyArchiveDevicePath)){
                                let retentionPart:any = _.get($this.archiveDevice,$this.retentionPolicyArchiveDevicePath);
                                retentionPart.push(newRetentionObject);
                            }else{
                                _.set($this.archiveDevice,$this.retentionPolicyArchiveDevicePath + `[0]`,newRetentionObject);
                            }
                        }else{
                            _.set($this.archiveDevice,$this.retentionPolicyArchiveDevicePath + `[${index}]`,newRetentionObject);
                        }
                        $this.service.saveArchivDevice($this.archiveDevice).subscribe(
                            (res)=>{
                                $this.mainservice.setMessage({
                                    'title': 'Info ',
                                    'text': `Study Retention Policy saved successfully to the archive device <b>${$this.archiveDevice.dicomDeviceName}</b>`,
                                    'status': 'info'
                                });
                                $this.StudyRetentionPolicy[index] = newRetentionObject;
                                $this.controlService.reloadArchive().subscribe((reloadres) => {
                                        $this.mainservice.setMessage({
                                            'title': 'Info',
                                            'text': 'Reload successful',
                                            'status': 'info'
                                        });
                                        $this.cfpLoadingBar.complete();
                                    }, (err) => {
                                        $this.cfpLoadingBar.complete();
                                    }
                                );
                            },
                            (err)=>{
                                $this.StudyRetentionPolicy[index] = retention;
                                $this.cfpLoadingBar.complete();
                                try{
                                    $this.mainservice.setMessage({
                                        'title': 'Error ' + err.status,
                                        'text': JSON.parse(err._body).errorMessage,
                                        'status': 'error'
                                    });

                                }catch (e){
                                    $this.mainservice.setMessage({
                                        'title': 'Error ' + err.status,
                                        'text': err.statusText,
                                        'status': 'error'
                                    });
                                }
                            }
                        );
                    }else{
                        $this.mainservice.setMessage( {
                            'title': 'Error',
                            'text': "Device not found, please reload the page and try gain!",
                            'status': 'error'
                        });
                    }
                }
            }
        );
    }
    appendFilter(filter, key, range, regex) {
        let value = range.from.replace(regex, '');
        if (range.to !== range.from)
            value += '-' + range.to.replace(regex, '');
        if (value.length)
            filter[key] = value;
    }
    clearForm(){
        _.forEach(this.filters, (m, i) => {
            if (i != 'orderby' && i != 'limit'){
                this.filters[i] = '';
            }
        });
        $('.single_clear').hide();
        this.clearStudyDate();
        // localStorage.setItem("dateset",false);
        this.studyDateChanged();
        this.studyTime.fromObject = null;
        this.studyTime.toObject = null;
        this.ExternalRetrieveAETchecked = null;
        this.studyTime.from = '';
        this.studyTime.to = '';
        this.StudyReceiveDateTime.from = undefined;
        this.StudyReceiveDateTime.to = undefined;
        // this.birthDate = {};
        // this.birthDate.object = null;
        // this.birthDate.opened = false;
    };
    studyReceiveDateTimeChanged(e, mode){
        this.filters['StudyReceiveDateTime'] = this.filters['StudyReceiveDateTime'] || {};
        this['StudyReceiveDateTime'][mode] = e;
        if (this.StudyReceiveDateTime.from && this.StudyReceiveDateTime.to){
            let datePipeEn = new DatePipe('us-US');
            this.filters['StudyReceiveDateTime'] = datePipeEn.transform(this.StudyReceiveDateTime.from, 'yyyyMMddHHmmss') + '-' + datePipeEn.transform(this.StudyReceiveDateTime.to, 'yyyyMMddHHmmss');
        }
    }
    studyDateChanged(){
        console.log('on studydate changed', this.studyDate);
        if (this.studyDate.from === '' && this.studyDate.to === ''){
            localStorage.setItem('dateset', 'no');
        }else if (this.studyDate.from != '' && this.studyDate.to != ''){
            localStorage.setItem('dateset', 'yes');
        }
    }
    clearStudyDate(){
        this.studyDate.fromObject = null;
        this.studyDate.toObject = null;
        this.studyDate.from = '';
        this.studyDate.to = '';
    }
    confirm(confirmparameters){
        // this.config.viewContainerRef = this.viewContainerRef;
        this.dialogRef = this.dialog.open(ConfirmComponent, {
            height: 'auto',
            width: '550px'
        });
        this.dialogRef.componentInstance.parameters = confirmparameters;
        return this.dialogRef.afterClosed();
    };
    search(){
        this.getStudies(false);
        this.getStudies(true);
    };
    dateToString(date){
        return (
            date.getFullYear() + '' +
            ((date.getMonth() < 9) ? '0' + (date.getMonth() + 1) : (date.getMonth() + 1)) + '' +
            ((date.getDate() < 10) ? '0' + date.getDate() : date.getDate())
        );
    }
    getArchiveDevice(retries){
        let $this = this;
        if(!this.mainservice.deviceName){
            if(retries){
                console.log("retry",retries);
                setTimeout(()=>{
                    $this.getArchiveDevice(retries-1);
                },400);
            }
        }else{
            this.service.getArchiveDevice(this.mainservice.deviceName).subscribe((res)=>{
                $this.archiveDevice = res;
                if(_.hasIn(res,"dcmArchiveDevice.dcmStudyRetentionPolicy")){
                    $this.archiveDevice = res;
                    $this.StudyRetentionPolicy = _.get(res,$this.retentionPolicyArchiveDevicePath);
                    console.log("$this.StudyRetentionPolicy ",$this.StudyRetentionPolicy );
                }
            },(err)=>{
                if(retries)
                    $this.getArchiveDevice(retries-1);
            });
        }
    }
    submitFunction(event){
        console.log("in submitFunction",event);
    }
    setInfinitExpiredDate(study){

        this.setExpiredDateQuery(study,true);
    }
    setExpiredDate(study){
        this.setExpiredDateQuery(study,false);
    }
    selectTime(state){
        let obj = state + 'Object';
        try{
            let n = this.studyTime[obj].getHours();
            let m = (this.studyTime[obj].getMinutes() < 10 ? '0' : '') + this.studyTime[obj].getMinutes();
            this.studyTime[state] = n + ':' + m;
        }catch (e){
            console.log('in catch ', this.studyTime);
        }
    }
    setExpiredDateQuery(study, infinit){
        let $this = this;
        let expiredDate;
        let yearRange = "1800:2100";
        if(infinit){
            expiredDate = new Date();
            expiredDate.setDate(31);
            expiredDate.setMonth(11);
            expiredDate.setFullYear(9999);
            yearRange = "2017:9999";
        }else{
            if(_.hasIn(study,"77771023.Value.0") && study["77771023"].Value[0] != ""){
                console.log("va",study["77771023"].Value[0]);
                let expiredDateString = study["77771023"].Value[0];
                expiredDate = new Date(expiredDateString.substring(0, 4)+ '.' + expiredDateString.substring(4, 6) + '.' + expiredDateString.substring(6, 8));
            }else{
                expiredDate = new Date();
            }
        }
        let parameters: any = {
            content: 'Set expired date',
            pCalendar: [{
                dateFormat:"dd.mm.yy",
                yearRange:yearRange,
                monthNavigator:true,
                yearNavigator:true,
                placeholder:"Expired date"
            }],
            result: {pCalendar:[expiredDate]},
            saveButton: 'SAVE'
        };
        this.confirm(parameters).subscribe(result => {
            if(result){
                $this.cfpLoadingBar.start();
                let dateAsString = $this.dateToString(result.pCalendar[0]);
                $this.service.setExpiredDate($this.aet, _.get(study,"0020000D.Value[0]"), dateAsString).subscribe(
                    (res)=>{
                        _.set(study,"77771023.Value[0]",$this.dateToString(result.pCalendar[0]));
                        $this.getStudies(true);
                        $this.mainservice.setMessage( {
                            'title': 'Info',
                            'text': 'Expired date set successfully!',
                            'status': 'info'
                        });
                        $this.cfpLoadingBar.complete();
                    },
                    (err)=>{
                        $this.mainservice.setMessage( {
                            'title': 'Error ' + err.status,
                            'text': err.statusText,
                            'status': 'error'
                        });
                        $this.cfpLoadingBar.complete();
                    }
                );
                // study["77771023"].Value[0] = result.pCalendar[0];
            }
        });
    }

    getStudies(expired){
        let $this = this;
        if(this.aet){
            let queryParameters = this.createQueryParams(this.filters.limit + 1, this.createStudyFilterParams());
            this.service.getStudies(this.aet, queryParameters, expired).subscribe(
                (res)=>{
                    if(expired){
                        $this.expiredStudies = res;
                    }else{
                        $this.allStudies = res;
                    }
                },
                (err)=>{

                }
            );
        }else{
            alert("no aet"+this.aet);
        }
    }
    createStudyFilterParams() {
        let filter = Object.assign({}, this.filters);
        this.appendFilter(filter, 'StudyDate', this.studyDate, /-/g);
        this.appendFilter(filter, 'StudyTime', this.studyTime, /:/g);
        return filter;
    };

    calculateWidthOfTable(tableName){
        let summ = 0;
        _.forEach(this[tableName],(m,i)=>{
            summ += m.widthWeight;
        });
        _.forEach(this[tableName],(m,i)=>{
            m.calculatedWidth =  ((m.widthWeight * 100)/summ)+"%";
        });
    };
    createQueryParams(limit, filter) {
        let params = {
            includefield: 'all',
            limit: limit
        };
        for (let key in filter){
            if (filter[key] || filter === false){
                params[key] = filter[key];
            }
        }
        return params;
    };
    toggleBar(mode){
        if(this.toggle === mode){
            this.toggle = '';
        }else{
            this.toggle = mode;
        }
    }
    getAets(retries){
        let $this = this;
        this.service.getAets().subscribe(
            (aets)=>{
                $this.aets = aets;
                $this.aet = aets[0].title;
            },
            (err)=>{
                if (retries){
                    $this.getAets(retries - 1);
                }
            }
        );
    };
}
