import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card"

const ActivityTimelineCard = ({ title, hourlyRatings }) => {
  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', hour12: true });
  }

  const getColorClasses = (rating) => {
    if (rating > 7.5) {
      return 'bg-green-500 hover:bg-green-400';
    } else if (rating > 4) {
      return 'bg-yellow-500 hover:bg-yellow-400';
    } else {
      return 'bg-red-500 hover:bg-red-400';
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
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-1 w-full">
          {hourlyRatings.map(({ time, rating }) => {
            const colorClasses = getColorClasses(rating);
            return (
              <div key={time} className="flex-1 group relative">
                <div className={`h-10 w-full rounded transition-all duration-200 ${colorClasses}`}></div>
                <div className="absolute bottom-full mb-2 w-max left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {formatTime(time)}: {rating.toFixed(1)}/10
                  <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
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