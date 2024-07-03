import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { map } from 'rxjs/operators';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-moment';
import { FormGroup, FormControl} from '@angular/forms';

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.css']
})
export class ChartComponent implements OnInit {
  chart: any;
  multiChart: any;
  chartData: any[] = [];
  colours = {
    Barita : 'rgb(22, 121, 171)',
    Scotia : 'rgb(238, 78, 78)',
    JMMB : 'rgb(255, 222, 149)',
    Sagicor : 'rgb(173, 216, 153)'
  };
  blankDataset = {
    label: 'Scatter Dataset',
    data: [],
    showLine: true,
  };
  indexFunds: any = [
    {
      value: 'JMMB/Units/IncomeandGrowth',
      label: 'JMMB - Income and Growth'
    },
    {
      value: 'Barita/Units/CapitalGrowth',
      label: 'Barita - Capital Growth'
    }];
  form = new FormGroup({
    indexFundIndex: new FormControl(0)
  });

  /*
  JMMB
    JMD Bond Fund
    JMD GiltedgeRate
    JMD Income Distributed Fund

   Sagicor
    Principal Protector (JMD)

   Scotia
    Scotia Premium Short Term Income Fund (JMD)
    Scotia Premium Fixed Index Fund

   Barita
    MoneyMarket



   */

  constructor(private db: AngularFirestore) { }

  ngOnInit(): void {

    this.chart = new Chart('canvas', {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Scatter Dataset',
          data: this.chartData,
          backgroundColor: 'rgb(255, 99, 132)',
          showLine: true
        }]
      },
      options: {
        scales: {
          x: {
            type: 'time',
            time: {
              displayFormats: {
                day: 'MMM DD, YYYY'
                // or any desired format
              }
            }
          }
        }
      }
    });

    this.multiChart = new Chart('multiPlot', {
      type: 'scatter',
      data: {
        datasets: []
      },
      options: {
        scales: {
          x: {
            type: 'time',
            time: {
              displayFormats: {
                day: 'MMM DD, YYYY'
                // or any desired format
              }
            }
          }
        }
      }
    });

    this.db.collection('IndexFundKeys').snapshotChanges().pipe(
      map(changes =>
        changes.map(c => {
            const rawData: any = c.payload.doc.data();
            return ({id: c.payload.doc.id, data: rawData});
          }
        )
      )
    ).subscribe(data => {

      const indexFundsData = data.map(item => {
        return {
          value: item.data.company + '/Units/' + item.data.key,
          label: item.data.company + ' - ' + item.data.key
        };
      });
      this.indexFunds = [...indexFundsData];

      this.fetchSingleChartData();
      this.fetchMultiChartData();
    });
  }

  fetchSingleChartData(): void {

    const index = this.form.controls.indexFundIndex.value;
    const fund = this.indexFunds[index];
    const path = fund.value;
    const label = fund.label;

    this.plotChart(path, label, 0, this.chart, null);
    this.chart.update();
  }

  fetchMultiChartData(): void {
    this.indexFunds.forEach( (fund, index) => {
      const path = fund.value;
      const label = fund.label;
      console.log(path);

      this.multiChart.options.animation.duration = 0;
      this.plotChart(path, label, index, this.multiChart, this.calcPercentageChange);
    });
  }

  plotChart(path, label, index, chart, func): void {
    this.db.collection(path).snapshotChanges().pipe(
      map(changes =>
        changes.map(c => {
            const rawData: any = c.payload.doc.data();
            return ({id: c.payload.doc.id, data: rawData});
          }
        )
      )
    ).subscribe(data => {
      const chartData = data.map(item => {
        if (func == null){
          return {x: new Date(item.data.date).getTime(), y: item.data.price};
        }
        return {x: new Date(item.data.date).getTime(), y: func(data[0].data.price, item.data.price)};
      });

      console.log(label);
      this.updateDataset(chart, index, label, chartData);
      chart.update();
    });
  }
  updateDataset(chart, index, label, data): void{
    while (index >= chart.data.datasets.length){
      chart.data.datasets.push({ ...this.blankDataset});
    }
    const colour = this.getColourFromLabel(label);
    chart.data.datasets[index].label = label;
    chart.data.datasets[index].data = data;
    if (colour !== null) {
      chart.data.datasets[index].backgroundColor = colour;
      chart.data.datasets[index].borderColor = colour;
    }
  }

  calcPercentageChange(startVal , currentVal): number{
    return (currentVal - startVal) / startVal * 100;
  }

  getColourFromLabel(label): string{
    for (const colourKey in this.colours) {
      if (label.includes(colourKey)){
        return this.colours[colourKey];
      }
    }
    return null;
  }


}

