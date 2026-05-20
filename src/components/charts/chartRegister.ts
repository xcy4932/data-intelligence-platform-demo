import { BarChart, FunnelChart, LineChart, PieChart } from 'echarts/charts'
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkPointComponent,
  TooltipComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

use([
  BarChart,
  CanvasRenderer,
  DataZoomComponent,
  FunnelChart,
  GridComponent,
  LegendComponent,
  LineChart,
  MarkPointComponent,
  PieChart,
  TooltipComponent,
])
