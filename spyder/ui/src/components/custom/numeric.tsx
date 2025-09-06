import { cn } from "@/lib/utils";

interface TemperatureProps {
  temp: any;
}

/**
 * Numeric component that displays the temperature value.
 *
 * @param {number} props.temp - The temperature value to be displayed.
 * @returns {JSX.Element} The rendered Numeric component.
 */
function Numeric({ temp }: TemperatureProps) {
  const temperature = Number(temp);
  const getTemperatureColor = () => {
    if (temperature >= 20 && temperature <= 25) {
      return "text-yellow-500"; // Safe range - green
    } else if (temperature >= 75 && temperature <= 80) {
      return "text-yellow-500"; // Safe range - green
    } else if (temperature >= 25 && temperature <= 75) {
      return "text-green-500"; // Safe range - green
    } else {
      return "text-red-500";
    }
  };

  return (
    <div
      className={cn(
        "text-4xl font-bold transition-colors duration-300",
        getTemperatureColor()
      )}>
      {`${temperature.toFixed(3)}°C`}
    </div>
  );
}

export default Numeric;
