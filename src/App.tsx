// React 17+ with new JSX transform doesn't require React import in scope
import {
  Demo_StyledBrush,
  Demo_UndefinedData,
  Demo_OutOfRangeWindow,
  Demo_TallBrush,
  Demo_MaxRange15Days,
  Demo_OneDayRange,
  Demo_SevenDayRange
} from '../components/CustomBrushLineChart'
import {
  Demo_Clean_Default,
  Demo_Clean_WithZoom,
  Demo_Clean_OneDayRange,
  Demo_Clean_YearRange
} from '../components/CustomBrushLineChart2'
import MultiDeviceLatencyChart from '../components/MultiDeviceLatencyChart'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Custom Brush Line Chart Preview
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Interactive chart component with custom brush selection for time-series data visualization. 
            Features dynamic tick density, responsive design, smooth drag interactions, and zoom functionality.
          </p>
        </header>

        <div className="space-y-12">
          {/* Multi-device latency dataset */}
          <section className="bg-emerald-50 p-8 rounded-lg border-2 border-emerald-200">
            <h2 className="text-3xl font-bold text-emerald-900 mb-4 flex items-center">
              <span className="bg-emerald-500 text-white px-2 py-1 rounded text-sm mr-3">DATA</span>
              5-Device Latency History (from TSV dataset)
            </h2>
            <p className="text-emerald-800 mb-8 text-lg">
              Visualizes the provided hourly latency measurements for dev-1..dev-5. Place the dataset as <code>public/latency.tsv</code>.
            </p>
            <MultiDeviceLatencyChart />
          </section>

          {/* Improved Component Section */}
          <section className="bg-blue-50 p-8 rounded-lg border-2 border-blue-200">
            <h2 className="text-3xl font-bold text-blue-900 mb-4 flex items-center">
              <span className="bg-blue-500 text-white px-2 py-1 rounded text-sm mr-3">NEW</span>
              Improved Custom Brush Line Chart
            </h2>
            <p className="text-blue-800 mb-8 text-lg">
              Enhanced version with clean time labels, smart tick density, and improved UX.
            </p>

            <div className="space-y-8">
              {/* Default Demo */}
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Default Configuration</h3>
                <p className="text-gray-600 mb-4">
                  15 days of hourly data with clean time labels at regular intervals.
                </p>
                <Demo_Clean_Default />
              </div>

              {/* With Zoom */}
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">With Zoom Functionality</h3>
                <p className="text-gray-600 mb-4">
                  30 days of hourly data. Scroll to zoom and see how labels adapt to the view range.
                </p>
                <Demo_Clean_WithZoom />
              </div>

              {/* One Day Range */}
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">24-Hour View</h3>
                <p className="text-gray-600 mb-4">
                  Single day view with 3-hour intervals and clean time labels.
                </p>
                <Demo_Clean_OneDayRange />
              </div>

              {/* Year Range */}
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Annual Data View</h3>
                <p className="text-gray-600 mb-4">
                  365 days of hourly data. Shows only date labels for long ranges.
                </p>
                <Demo_Clean_YearRange />
              </div>
            </div>
          </section>

          {/* Original Component Section */}
          <section className="bg-gray-50 p-8 rounded-lg border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Original Implementation</h2>
            <p className="text-gray-600 mb-8">
              The original custom brush implementation for comparison.
            </p>

            <div className="space-y-8">
              {/* Default Demo */}
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Default Configuration</h3>
                <p className="text-gray-600 mb-4">
                  Basic chart with 15 days of hourly data and default settings.
                </p>
                <Demo_StyledBrush />
              </div>

              {/* Other original demos */}
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Fallback Data</h3>
                <p className="text-gray-600 mb-4">
                  Chart behavior when no data is provided - shows fallback dataset.
                </p>
                <Demo_UndefinedData />
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">One Day Range</h3>
                <p className="text-gray-600 mb-4">
                  24-hour view showing hourly tick marks with high density.
                </p>
                <Demo_OneDayRange />
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Seven Day Range</h3>
                <p className="text-gray-600 mb-4">
                  Weekly view demonstrating adaptive tick spacing for medium-term data.
                </p>
                <Demo_SevenDayRange />
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Custom Data Set</h3>
                <p className="text-gray-600 mb-4">
                  40 hours of data with sinusoidal pattern and minimum selection constraints.
                </p>
                <Demo_TallBrush />
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Extended Dataset (30 Days)</h3>
                <p className="text-gray-600 mb-4">
                  30 days of data with 15-day maximum selection limit, demonstrating long-term data handling.
                </p>
                <Demo_MaxRange15Days />
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Out of Range Window</h3>
                <p className="text-gray-600 mb-4">
                  Small dataset (10 points) with intentionally out-of-range window to test bounds clamping.
                </p>
                <Demo_OutOfRangeWindow />
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-16 text-center text-gray-500">
          <p>
            Built with React, Recharts, and Tailwind CSS. 
            Drag the brush handles or selection area to interact with the charts.
          </p>
        </footer>
      </div>
    </div>
  )
}

export default App