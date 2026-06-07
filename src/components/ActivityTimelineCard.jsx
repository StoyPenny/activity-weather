import { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card"
import MetricTooltip from "./MetricTooltip"
import { extractHighLowTides } from "../lib/tides"

const ActivityTimelineCard = ({ title, hourlyRatings, tideData }) => {
  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', hour12: true });
  }

  const getColorClasses = (rating) => {
    // 5-level rating system: Poor, Fair, Good, Very Good, Excellent
    if (rating >= 8) {
      return 'bg-blue-500 hover:bg-blue-400'; // Excellent (8-10)
    } else if (rating >= 6) {
      return 'bg-green-500 hover:bg-green-400'; // Very Good (6-8)
    } else if (rating >= 4) {
      return 'bg-yellow-500 hover:bg-yellow-400'; // Good (4-6)
    } else if (rating >= 2) {
      return 'bg-orange-500 hover:bg-orange-400'; // Fair (2-4)
    } else {
      return 'bg-red-500 hover:bg-red-400'; // Poor (0-2)
    }
  };

  // Extract tide events if data is available for this day
  const tideEvents = useMemo(() => {
    if (!tideData || !hourlyRatings || hourlyRatings.length === 0) return [];
    
    // Check if tide data is for the same day as the hourly ratings
    const ratingsDate = new Date(hourlyRatings[0].time).toDateString();
    
    // Normalize tide date string to handle potential timezone shifts or format differences
    // tideData.date is usually YYYY-MM-DD
    const tideDateStr = new Date(tideData.date + 'T00:00:00').toDateString();
    
    if (ratingsDate !== tideDateStr) return [];
    
    return extractHighLowTides(tideData);
  }, [tideData, hourlyRatings]);

  // Helper to find tide event for a specific hour
  const getTideForHour = (hourTimeStr) => {
    const hourTime = new Date(hourTimeStr);
    const hour = hourTime.getHours();
    
    return tideEvents.find(event => {
      const eventTime = new Date(event.t.replace(' ', 'T'));
      return eventTime.getHours() === hour;
    });
  };

  if (!hourlyRatings || hourlyRatings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">No data for {title}</div>
        </CardContent>
      </Card>
    );
  }

  // Calculate current rating based on current time
  const now = new Date();
  const currentHour = now.getHours();
  
  // Check if this card represents "today"
  const firstHourTime = new Date(hourlyRatings[0].time);
  const isToday = firstHourTime.toDateString() === now.toDateString();

  // Determine display rating and label
  let displayRating = null;
  let ratingLabel = 'Peak';

  if (isToday) {
    // Find the rating for the current hour
    const currentHourData = hourlyRatings.find(hourData => {
      const hourTime = new Date(hourData.time);
      return hourTime.getHours() === currentHour;
    });

    if (currentHourData) {
      const ratingData = currentHourData.rating;
      displayRating = typeof ratingData === 'object' ? ratingData.rating : ratingData;
      ratingLabel = 'Now';
    }
  }

  // Fallback: use max rating for the day if not today or no current hour data
  if (displayRating === null && hourlyRatings.length > 0) {
    displayRating = Math.max(...hourlyRatings.map(hourData => {
      const ratingData = hourData.rating;
      return typeof ratingData === 'object' ? ratingData.rating : ratingData;
    }));
    ratingLabel = 'Peak';
  }

  return (
    <div className='card-wrapper w-1/3 flex-shrink-0 p-3'>
      <Card className="dark:bg-blue-900/20 border dark:border-blue-900/50 rounded-lg shadow-md">

        <CardContent>
          <h3 className="text-center font-semibold text-xl mb-1 dark:text-blue-100 dark:text-opacity-75">
            {title}
          </h3>
          
          <div className="text-6xl font-bold text-center mb-6">
            <span className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">
              {ratingLabel}
            </span>
            {displayRating !== null ? displayRating.toFixed(1) : 'N/A'}
          </div>

          {tideEvents.length > 0 && (
            <div className="flex space-x-1 w-full mb-1 h-4 items-end px-0.5">
              {hourlyRatings.map((hourData) => {
                const tideEvent = getTideForHour(hourData.time);
                if (!tideEvent) return <div key={hourData.time} className="flex-1" />;
                
                const isHigh = tideEvent.type === 'H' || tideEvent.type === 'h';
                return (
                  <div key={hourData.time} className="flex-1 flex justify-center group/tide relative">
                    <div className={`text-[10px] font-bold leading-none ${isHigh ? 'text-blue-500' : 'text-gray-400'}`}>
                      {tideEvent.type.toUpperCase()}
                    </div>
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover/tide:opacity-100 transition-opacity bg-gray-800 text-white text-[10px] py-0.5 px-1.5 rounded pointer-events-none whitespace-nowrap z-20 shadow-lg border border-gray-700">
                      {isHigh ? 'High' : 'Low'}: {parseFloat(tideEvent.v).toFixed(1)}ft
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex space-x-1 w-full">
            
            {hourlyRatings.map((hourData) => {
              const { time, rating: ratingData, metrics } = hourData;
              // Ensure rating is always a number (handle both object and number cases)
              const rating = typeof ratingData === 'object' ? ratingData.rating : ratingData;
              const colorClasses = getColorClasses(rating);
              return (
                <div
                  key={time}
                  className="flex-1 group relative"
                  role="button"
                  tabIndex={0}
                  aria-label={`${title} rating: ${rating.toFixed(1)} out of 10 at ${formatTime(time)}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      // Focus will show the tooltip via CSS
                    }
                  }}
                >
                  <div className={`h-10 w-full rounded transition-all duration-200 bg-gray-100 dark:bg-gray-700`}></div>
                  <div
                    className={`w-full rounded transition-all duration-200 absolute bottom-0 ${colorClasses}`}
                    style={{ height: `${(rating / 10) * 100}%` }}
                  ></div>
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity pointer-events-none z-10">
                    <MetricTooltip
                      time={time}
                      rating={rating}
                      metrics={metrics}
                      activityName={title}
                    />
                    <svg className="absolute text-gray-800 h-2 w-full left-1/2 -translate-x-1/2 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                      <polygon className="fill-current" points="0,0 127.5,127.5 255,0"></polygon>
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 px-1">
            <span>12:00 AM</span>
            <span>11:00 PM</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityTimelineCard;
