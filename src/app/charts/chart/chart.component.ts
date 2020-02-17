import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Label, Color } from 'ng2-charts';
import { ChartOptions, ChartDataSets } from 'chart.js';
import { ApiService } from 'src/app/services/api.service';
import { MediaQueryService } from 'src/app/services/media-query.service';
import { DataPoint, sampleLastInEachHour, formatDateToHour, formatDateToHourAndMinute } from 'src/app/utils/metric'

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss']
})
export class ChartComponent implements OnInit, OnDestroy {
  @Input()
  metricName: string;

  @Output()
  onClose = new EventEmitter();

  private subscription: Subscription;

  private readonly updateInterval: number = 60 * 1000;

  private timeWindow: number = 10;

  timeWindowInput: FormControl;

  chartLabels: Label[] = [];

  //NOTE: chartData must have at least one element(even if it's empty like below), otherwise
  //ng2-charts will throw an error! It seems an issue/bug of ng2-charts!
  chartData: ChartDataSets[] = [
    {
      data: [],
      label: '',
      steppedLine: 'before',
      pointRadius: 0,
    },
  ];

  //TODO: Generate colors in some algorithm in a *stable" way.
  chartColors: Color[] = [
    { backgroundColor: 'rgba(0,0,0,0)', borderColor: 'lightblue' },
    { backgroundColor: 'rgba(0,0,0,0)', borderColor: 'gray' },
    { backgroundColor: 'rgba(0,0,0,0)', borderColor: 'red' },
    { backgroundColor: 'rgba(0,0,0,0)', borderColor: 'green' },
    { backgroundColor: 'rgba(0,0,0,0)', borderColor: 'darkslategrey' },
    { backgroundColor: 'rgba(0,0,0,0)', borderColor: 'blue' },
    { backgroundColor: 'rgba(0,0,0,0)', borderColor: 'purple' },
  ];

  private chartOptions_: ChartOptions = {
    responsive: true,
    // aspectRatio: this.mediaQuery.smallWidth ? 1.5 : 3,
    title: {
      display: true,
      // text: this.metricName, //TODO: Show metric's DisplayName here
    },
    legend: {
      position: 'bottom',
    },
    tooltips: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      xAxes: [
        {
          ticks: {
            // maxTicksLimit: this.mediaQuery.smallWidth ? 3 : 5,
            maxRotation: 0,
          }
        }
      ],
    },
  };

  //NOTE: the chartOptions object(this.chartOptions_) passed to <canvas baseChart [options]="chartOptions"> must
  //remain across calls, otherwise there won't be anything drawn on the canvas! That means you can change its
  //properties but you can't return a different object in a different call! It seems an issue/bug in ng2-charts!
  get chartOptions(): ChartOptions {
    let aspectRatio = this.mediaQuery.smallWidth ? 1.5 : 3;
    let maxTicksLimit = this.mediaQuery.smallWidth ? 3 : 5;
    this.chartOptions_.aspectRatio = aspectRatio;
    this.chartOptions_.scales.xAxes[0].ticks.maxTicksLimit = maxTicksLimit;
    this.chartOptions_.title.text = this.metricName;
    return this.chartOptions_;
  }

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private mediaQuery: MediaQueryService,
  ) {
    this.timeWindowInput = this.fb.control(this.timeWindow, [Validators.required, Validators.min(1), Validators.max(50000)]);
    this.timeWindowInput.setValue(this.timeWindow);
  }

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  close(): void {
    this.onClose.emit();
  }

  private loadData(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.subscription = this.api.getLatestClusterMetricInLoop(this.metricName, this.timeWindow * 60 * 1000, this.updateInterval).subscribe(data => {
      if (data.Instances.length == 0 || data.Instances[0].Values.length == 0) {
        return;
      }
      //When there're data more than 2 hours, reduce it.
      if (data.Instances[0].Values.length > 120) {
        for (let instance of data.Instances) {
          instance.Values = sampleLastInEachHour(instance.Values as DataPoint[]);
        }
        this.chartLabels = data.Instances[0].Values.map(e => formatDateToHour(new Date(Date.parse(e.Key))));
      }
      else {
        this.chartLabels = data.Instances[0].Values.map(e => formatDateToHourAndMinute(new Date(Date.parse(e.Key))));
      }
      this.chartData = data.Instances.map(instance => ({
        data: instance.Values.map(e => e.Value),
        label: instance.InstanceName,
        steppedLine: 'before',
        pointRadius: 0,
      }));
    });
  }

  onTimeWindowChange(): void {
    if (this.timeWindowInput.invalid) {
      return;
    }
    this.timeWindow = this.timeWindowInput.value;
    this.loadData();
  }
}