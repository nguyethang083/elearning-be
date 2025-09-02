export const weather = {
  name: 'weather',
  description: 'Get current weather information for a location',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'The city or location to get weather for'
      }
    },
    required: ['location']
  },
  execute: async ({ location }) => {
    try {
      // This is a mock implementation
      // In a real app, you would call a weather API like OpenWeatherMap
      const mockWeather = {
        location: location,
        temperature: Math.floor(Math.random() * 30) + 10,
        condition: 'Sunny',
        humidity: Math.floor(Math.random() * 40) + 30,
        windSpeed: Math.floor(Math.random() * 20) + 5
      };

      return {
        location: mockWeather.location,
        temperature: `${mockWeather.temperature}°C`,
        condition: mockWeather.condition,
        humidity: `${mockWeather.humidity}%`,
        windSpeed: `${mockWeather.windSpeed} km/h`,
        message: `Current weather in ${location}: ${mockWeather.temperature}°C, ${mockWeather.condition}`
      };
    } catch (error) {
      return {
        error: 'Unable to fetch weather information',
        location: location
      };
    }
  }
}; 