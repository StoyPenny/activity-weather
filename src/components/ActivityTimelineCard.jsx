import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card"
import MetricTooltip from "./MetricTooltip"

const ActivityTimelineCard = ({ title, hourlyRatings, activeLocation }) => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title} {activeLocation ? `- ${activeLocation.name}` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                <div className={`h-20 w-full rounded transition-all duration-200 bg-gray-100`}></div>
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
          <span>{formatTime(hourlyRatings[0].time)}</span>
          <span>{formatTime(hourlyRatings[hourlyRatings.length - 1].time)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityTimelineCard;