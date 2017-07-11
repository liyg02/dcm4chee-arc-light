import {Component, OnInit, HostListener, ViewContainerRef} from '@angular/core';
import {StatisticsService} from "./statistics.service";
import * as _ from 'lodash';
import {Globalvar} from "../../constants/globalvar";
import {HistogramDialogComponent} from "../../widgets/dialogs/histogram-dialog/histogram-dialog.component";
import {MdDialogRef, MdDialog, MdDialogConfig} from "@angular/material";
import {SlimLoadingBarService} from "ng2-slim-loading-bar";

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html'
})
export class StatisticsComponent implements OnInit {

    range = {
        from: undefined,
        to: undefined
    };
    studieStored = {
        label:"Studies Stored Count",
        count:undefined
    };
    wildflError = {
        label:"Application Error",
        count:undefined
    };
    retriev = {
        label:"Retrieves Count",
        count:undefined
    };
    queries = {
        label:"Queries Count",
        count:undefined,
        model:undefined
    };
    errors = {
        label:"Audit Errors",
        count:undefined
    };
    auditEvents;
    moreAudit = {
        limit: 30,
        start: 0,
        loaderActive: false
    };
    toggle = "";
    searchlist = "";
    elasticSearchIsRunning = true;
    dialogRef: MdDialogRef<any>;
    activeTimeRange = "quick";
    quickMode = "today";
    quickModeOptions = [
        {
            value:"today",
            label:"Today"
        },
        {
            value:"thisweek",
            label:"This week"
        },
        {
            value:"thismonth",
            label:"This month"
        },
        {
            value:"last3month",
            label:"Last 3 months"
        },
        {
            value:"thisyear",
            label:"This year"
        }
    ]
    constructor(
        private service:StatisticsService,
        public viewContainerRef: ViewContainerRef,
        public dialog: MdDialog,
        public config: MdDialogConfig,
        public cfpLoadingBar: SlimLoadingBarService
    ) { }

    ngOnInit() {
        this.setTodayDate();
        this.init(2);
    }
    studyDateTimeChanged(e, mode){
        this.range[mode] = e;
    }
    clearForm(){
        this.range = {
            from: undefined,
            to: undefined
        };
    }
    changeActiveTimeRange(rangeType){
        this.activeTimeRange = rangeType;
        this.setTodayDate();
    }


    quickDateChange(mode){
        let d = new Date();
        switch(this.quickMode) {
            case "thisweek":
                console.log("d.getDay() ",d.getDate() );
                d.setDate(d.getDate() - 7);
                break;
            case "thismonth":
                console.log("d.getMonth() ",d.getMonth() );
                d.setMonth(d.getMonth() - 1);
                break;
            case "last3month":
                console.log("d.getMonth() ",d.getMonth() );
                d.setMonth(d.getMonth() - 3);
                break;
            case "thisyear":
                console.log("d.getFullYear() ",d.getFullYear() );
                d.setFullYear(d.getFullYear() - 1);
                break;
            default:
                console.log("d.getDate() ",d.getDate() );
                d.setDate(d.getDate() - 1);
        }
        this.range.from = d;
        this.range.to = new Date();
    }
    setTodayDate(){
        let d = new Date();
        d.setDate(d.getDate() - 1);
        this.range.from = d;
        this.range.to = new Date();
    }
    init(retries){
        let $this = this;
        this.service.checkIfElasticSearchIsRunning().subscribe(
            (res)=>{
                $this.elasticSearchIsRunning = true;
                $this.search();
            },
            (err)=>{
                if (retries){
                    $this.init(retries-1);
                }else{
                    $this.elasticSearchIsRunning = false;
                }
            }
        );
    }
    toggleBlock(mode,e){
        console.log("e",e.target.nodeName);
        if(e.target.nodeName != "INPUT"){
            if(this.toggle  === "AUDITEVENTS"){
                this.moreAudit = {
                    limit: 30,
                    start: 0,
                    loaderActive: false
                };
            }
            this.toggle = (this.toggle === mode)? '':mode;
        }
    }

    @HostListener('window:scroll', ['$event'])
    loadMoreAuditOnScroll(event) {
        let hT = ($('.load_more').offset()) ? $('.load_more').offset().top : 0,
            hH = $('.load_more').outerHeight(),
            wH = $(window).height(),
            wS = window.pageYOffset;
        console.log("ws",wS);
        console.log("hT + hH - wH",(hT + hH - wH));
        if (wS > (hT + hH - wH)){
            this.loadMoreAudit();
        }
    }
    loadMoreAudit(){
        this.moreAudit.loaderActive = true;
        this.moreAudit.limit += 20;
        this.moreAudit.loaderActive = false;
    }
    search(){
        this.getAuditEvents();
        this.getErrorCounts();
        this.getRetrieveCounts();
        this.getStudiesStoredCounts();
        this.getWildflyErrorCounts();
        // this.getQueriesCounts();
        this.getQueriesUserID();
        this.getRetrievUserID();
        this.getStudiesStoredSopClass();
        this.getStudiesStoredReceivingAET();
        this.getStudiesStoredUserID();
    }
    //barChartOptions.legend.position
    public barChartOptions:any = {
        scaleShowVerticalLines: false,
        responsive: true,
        maintainAspectRatio: false,
        legend:{
            position:'right'
        },
        scales: {
            xAxes: [{
                type: 'time',
                time: {
                    displayFormats: {
                        'millisecond': 'DD.MM.YYYY',
                        'second': 'DD.MM.YYYY',
                        'minute': 'DD.MM.YYYY',
                        'hour': 'DD.MM.YYYY',
                        'day': 'DD.MM.YYYY',
                        'week': 'DD.MM.YYYY',
                        'month': 'DD.MM.YYYY',
                        'quarter': 'DD.MM.YYYY',
                        'year': 'DD.MM.YYYY',
                    }
                }
            }],
            yAxes: [{
                ticks: {
                    min: 0
                },
                scaleLabel: {
                    display: true,
                    labelString: 'Queries'
                }
            }]
        }
    };
    //barChartOptions.scales.yAxes[0].scaleLabel.labelString
    public barChartLabels = [];
    public pieChartColor =  Globalvar.HISTOGRAMCOLORS;
    public barChartType:string = 'bar';
    public barChartLegend:boolean = true;
    public barChartData:any[] = [];
    histogramData = {
        querieUserID:{
            labels:[],
            data:{},
            ready:{
                labels:[],
                data:[]
            },
            show:true,
            chartOptions:{}
        },
        queriesCounts:{
            labels:[],
            data:{},
            ready:{
                labels:[],
                data:[]
            },
            show:true,
            chartOptions:{}
        },
        retrievesUserID:{
            labels:[],
            data:{},
            ready:{
                labels:[],
                data:[]
            },
            show:true,
            chartOptions:{}
        },
        studyStoredSopClass:{
            labels:[],
            data:{},
            ready:{
                labels:[],
                data:[]
            },
            show:true,
            chartOptions:{}
        },
        studyStoredUserID:{
            labels:[],
            data:{},
            ready:{
                labels:[],
                data:[]
            },
            show:true,
            chartOptions:{}
        },
        studyStoredReceivingAET:{
            labels:[],
            data:{},
            ready:{
                labels:[],
                data:[]
            },
            show:true,
            chartOptions:{}
        }
    }
    // events
    public chartClicked(e:any):void {
        console.log(e);
    }

    public chartHovered(e:any):void {
        console.log(e);
    }
    isRangeSmallerThan24H(){
        if((new Date(this.range.to).getTime()) - (new Date(this.range.from).getTime()) < 86400005)
            return true;
        else
            return false;
    }
    refreshChart(histogram){
        this.histogramData[histogram].show = false;
        setTimeout(()=>{
            this.histogramData[histogram].show = true;
        },1);
    }
    prepareHistogramData(response, histogram){
        let $this = this;
        $this.histogramData[histogram] = {
            labels:[],
            data:{},
            ready:{
                labels:[],
                    data:[]
            }
        }
        this.histogramData[histogram].chartOptions = _.cloneDeep(this.barChartOptions);
        if(this.isRangeSmallerThan24H()){

            this.histogramData[histogram].chartOptions['scales'].xAxes[0].time.displayFormats = {
                'millisecond': 'HH:mm:ss',
                'second': 'HH:mm:ss',
                'minute': 'HH:mm:ss',
                'hour': 'HH:mm:ss',
                'day': 'HH:mm:ss',
                'week': 'HH:mm:ss',
                'month': 'HH:mm:ss',
                'quarter': 'HH:mm:ss',
                'year': 'HH:mm:ss',
            }
        }else{
            this.histogramData[histogram].chartOptions['scales'].xAxes[0].time.displayFormats = {
                'millisecond': 'DD.MM.YYYY',
                'second': 'DD.MM.YYYY',
                'minute': 'DD.MM.YYYY',
                'hour': 'DD.MM.YYYY',
                'day': 'DD.MM.YYYY',
                'week': 'DD.MM.YYYY',
                'month': 'DD.MM.YYYY',
                'quarter': 'DD.MM.YYYY',
                'year': 'DD.MM.YYYY',
            }
        }
        if(_.hasIn(response,"aggregations.2.buckets") && _.size(response.aggregations[2].buckets) > 0){
            _.forEach(response.aggregations["2"].buckets,(m,i)=>{
                $this.histogramData[histogram].labels.push(m.key);
                _.forEach(m[3].buckets,(bucket,bIndex)=>{
                    $this.histogramData[histogram].data[bucket.key] = $this.histogramData[histogram].data[bucket.key] ? $this.histogramData[histogram].data[bucket.key] : {};
                    $this.histogramData[histogram].data[bucket.key].data = $this.histogramData[histogram].data[bucket.key].data || [];
                    if($this.histogramData[histogram].data[bucket.key].data.length < $this.histogramData[histogram].labels.length){
                        for (let arr = 0; arr < $this.histogramData[histogram].labels.length;arr++){
                            if(!$this.histogramData[histogram].data[bucket.key].data[arr]){
                                $this.histogramData[histogram].data[bucket.key].data.push(null);
                            }
                        }
                    }
                    $this.histogramData[histogram].data[bucket.key].data[$this.histogramData[histogram].labels.length-1] = bucket.doc_count;
                });
            });
            $this.histogramData[histogram].ready.labels = [this.range.from, ...$this.histogramData[histogram].labels.map(time => { return new Date(time);}), this.range.to];
            _.forEach($this.histogramData[histogram].data,(d,j)=>{
                $this.histogramData[histogram].ready.data.push({
                    label:j,
                    data:[null,...d.data,null]
                });
            });
            if(Object.keys($this.histogramData[histogram].data).length < 11){
                $this.histogramData[histogram].chartOptions.legend.position = 'top';
            }else{
                if(Object.keys($this.histogramData[histogram].data).length < 30){
                    $this.histogramData[histogram].chartOptions.legend.position = 'right';
                }else{
                    $this.histogramData[histogram] = {
                        labels:[],
                        data:{},
                        ready:{
                            labels:[],
                            data:[]
                        },
                        noDataText:"Too much data!",
                    }
                }
            }
            this.refreshChart(histogram);
        }else{
            console.log("in empty data",response);
            $this.histogramData[histogram] = {
                labels:[],
                data:{},
                ready:{
                    labels:[],
                    data:[]
                },
                noDataText:"No data found!",
            }
        }
        console.log("$this.histogramData",$this.histogramData);
    }
    getQueriesUserID(){
        let $this = this;
        this.service.getQueriesUserID(this.range).subscribe(
            (res)=>{
                $this.prepareHistogramData(res,'querieUserID');
                try {
                    $this.queries.count = res.hits.total;
                }catch (e){
                    $this.queries.count = "-";
                }
            },
            (err)=>{
                $this.studieStored.count = "-";
                console.log("error",err);
            });
    }
    getRetrievUserID(){
        let $this = this;
        this.service.getRetrievUserID(this.range).subscribe(
            (res)=>{
                console.log("userid queries =",res);
                $this.prepareHistogramData(res,'retrievesUserID');
                if(_.hasIn($this.histogramData,'retrievesUserID.chartOptions.scales.yAxes[0].scaleLabel.labelString')){
                    $this.histogramData["retrievesUserID"].chartOptions['scales'].yAxes[0].scaleLabel.labelString = "Retrieves";
                }
                try {
                    $this.queries.count = res.hits.total;
                }catch (e){
                    $this.queries.count = "-";
                }
            },
            (err)=>{
                console.log("error",err);
            });
    }
    getStudiesStoredSopClass(){
        let $this = this;
        this.service.getStudiesStoredSopClass(this.range).subscribe(
            (res)=>{
                console.log("userid queries =",res);
                $this.prepareHistogramData(res,'studyStoredSopClass');
                if(_.hasIn($this.histogramData,'studyStoredSopClass.chartOptions.scales.yAxes[0].scaleLabel.labelString')){
                    $this.histogramData["studyStoredSopClass"].chartOptions['scales'].yAxes[0].scaleLabel.labelString = "Studies";
                }
            },
            (err)=>{
                console.log("error",err);
            });
    }
    getStudiesStoredUserID(){
        let $this = this;
        this.service.getStudiesStoredUserID(this.range).subscribe(
            (res)=>{
                console.log("userid queries =",res);
                $this.prepareHistogramData(res,'studyStoredUserID');
                if(_.hasIn($this.histogramData,'studyStoredUserID.chartOptions.scales.yAxes[0].scaleLabel.labelString')){
                    $this.histogramData["studyStoredUserID"].chartOptions['scales'].yAxes[0].scaleLabel.labelString = "Count";
                }
            },
            (err)=>{
                console.log("error",err);
            });
    }
    getStudiesStoredReceivingAET(){
        let $this = this;
        this.service.getStudiesStoredReceivingAET(this.range).subscribe(
            (res)=>{
                console.log("userid queries =",res);
                $this.prepareHistogramData(res,'studyStoredReceivingAET');
                if(_.hasIn($this.histogramData,'studyStoredReceivingAET.chartOptions.scales.yAxes[0].scaleLabel.labelString')){
                    $this.histogramData["studyStoredReceivingAET"].chartOptions['scales'].yAxes[0].scaleLabel.labelString = "Count";
                }
            },
            (err)=>{
                console.log("error",err);
            });
    }
    getAuditEvents(){
        let $this = this;
        this.service.getAuditEvents(this.range).subscribe((res)=>{
            $this.auditEvents = res.hits.hits.map((audit)=>{
                return {
                    AuditSourceID:(_.hasIn(audit,"_source.AuditSource.AuditSourceID"))?audit._source.AuditSource.AuditSourceID:'-',
                    EventID:(_.hasIn(audit,"_source.EventID.originalText"))?audit._source.EventID.originalText:'-',
                    ActionCode:(_.hasIn(audit,"_source.Event.EventActionCode"))?audit._source.Event.EventActionCode:'-',
                    Patient:(_.hasIn(audit,"_source.Patient.ParticipantObjectName"))?audit._source.Patient.ParticipantObjectName:'-',
                    Study:(_.hasIn(audit,"_source.Study.ParticipantObjectID"))?audit._source.Study.ParticipantObjectID:'-',
                    AccessionNumber:(_.hasIn(audit,"_source.AccessionNumber"))?audit._source.AccessionNumber:'-',
                    userId:(_.hasIn(audit,"_source.Source.UserID"))?audit._source.Source.UserID:'-',
                    requestorId:(_.hasIn(audit,"_source.Requestor.UserID"))?audit._source.Requestor.UserID:'-',
                    EventOutcomeIndicator:(_.hasIn(audit,"_source.Event.EventOutcomeIndicator"))?audit._source.Event.EventOutcomeIndicator:'-',
                    Time:(_.hasIn(audit,"_source.Event.EventDateTime"))?audit._source.Event.EventDateTime:undefined
                }
            });
        });
    }
    getStudiesStoredCounts(){
        let $this = this;
        this.service.getStudiesStoredCounts(this.range).subscribe(
            (res)=>{
                try {
                    $this.studieStored.count = res.hits.total;
                }catch (e){
                    $this.studieStored.count = "-";
                }
            },
            (err)=>{
                $this.studieStored.count = "-";
                console.log("error",err);
            });
    }
    getWildflyErrorCounts(){
        let $this = this;
        this.service.getWildflyErrorCounts(this.range).subscribe(
            (res)=>{
                try {
                    $this.wildflError.count = res.hits.total;
                }catch (e){
                    $this.wildflError.count = "-";
                }
            },
            (err)=>{
                $this.wildflError.count = "-";
                console.log("error",err);
            });
    }
    getRetrieveCounts(){
        let $this = this;
        this.service.getRetrieveCounts(this.range).subscribe(
            (res)=>{
                try {
                    $this.retriev.count = res.hits.total;
                }catch (e){
                    $this.retriev.count = "-";
                }
            },
            (err)=>{
                $this.retriev.count = "-";
                console.log("error",err);
            });
    }
    openQueriesCountsHistogram(){
        let $this = this;
        // $this.prepareHistogramData($this.queries.model,'queriesCounts');
        $this.config.viewContainerRef = $this.viewContainerRef;
        $this.dialogRef = $this.dialog.open(HistogramDialogComponent, {
            height: 'auto',
            width: '80%'
        });
        $this.dialogRef.componentInstance.histogramData = $this.histogramData;
        $this.dialogRef.componentInstance.pieChartColor = $this.pieChartColor;
        $this.dialogRef.componentInstance.barChartLegend = $this.barChartLegend;
        $this.dialogRef.componentInstance.barChartType = $this.barChartType;
        $this.dialogRef.componentInstance.title = "Queries Count";
        $this.dialogRef.afterClosed().subscribe((result) => {
            console.log('result', result);
            if (result){
            }
        });
    }
    // getQueriesCounts(){
    //     let $this = this;
    //     this.service.getQueriesCounts(this.range).subscribe(
    //         (res)=>{
    //             try {
    //                 $this.queries.count = res.hits.total;
    //                 $this.prepareHistogramData(res,'queriesCounts');
    //             }catch (e){
    //                 $this.queries.count = "-";
    //             }
    //         },
    //         (err)=>{
    //             console.log("error",err);
    //             $this.queries.count = "-";
    //         });
    // }
    getErrorCounts(){
        let $this = this;
        this.service.getErrorCounts(this.range).subscribe(
            (res)=>{
                try {
                    $this.errors.count = res.hits.total;
                }catch (e){
                    $this.errors.count = "-";
                }
            },
            (err)=>{
                console.log("error",err);
                $this.errors.count = "-";
            });
    }

}
