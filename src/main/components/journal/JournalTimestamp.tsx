import React, { useMemo } from "react";
import {
  FormattedDate,
  FormattedRelativeTime,
  FormattedTime,
} from "react-intl";
import { useTimer } from "../../hooks/timer";

const relativeThreshold = 1000 * 60 * 60 * 24;

interface JournalTimestampProps {
  value: string;
}

export const JournalTimestamp: React.FC<JournalTimestampProps> = (props) => {
  const { value } = props;
  const timestamp = useMemo(() => new Date(value), [value]);
  const now = useTimer("minute");

  const timeDiff = timestamp.getTime() - now.getTime();
  if (timeDiff > -relativeThreshold) {
    const value = Math.min(-1, Math.round(timeDiff / 1000));
    return (
      <FormattedRelativeTime
        key={value}
        value={value}
        style="narrow"
        updateIntervalInSeconds={1}
      />
    );
  } else if (
    timestamp.getDate() === now.getDate() &&
    timestamp.getMonth() === now.getMonth() &&
    timestamp.getFullYear() === now.getFullYear()
  ) {
    return <FormattedTime value={timestamp} />;
  } else {
    return (
      <FormattedDate
        value={timestamp}
        year="numeric"
        month="short"
        day="numeric"
      />
    );
  }
};
