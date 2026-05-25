import {
  BarChart,
  FunnelChart,
  GaugeChart,
  LineChart,
  MapChart,
  PieChart,
  RadarChart,
  SankeyChart,
  ScatterChart,
} from 'echarts/charts'
import {
  DataZoomComponent,
  GeoComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  MarkPointComponent,
  RadarComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

use([
  BarChart,
  CanvasRenderer,
  DataZoomComponent,
  FunnelChart,
  GaugeChart,
  GeoComponent,
  GridComponent,
  LegendComponent,
  MapChart,
  MarkLineComponent,
  LineChart,
  MarkPointComponent,
  PieChart,
  RadarChart,
  RadarComponent,
  SankeyChart,
  ScatterChart,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
])
