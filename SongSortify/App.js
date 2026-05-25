import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';
import CategorySelectionScreen from "./screens/CategorySelectionScreen";
import ResultsScreen from './screens/ResultsScreen';


const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer> 
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name='Home' component={HomeScreen} options={{ gestureEnabled: false }}/>
        <Stack.Screen name='Settings' component={SettingsScreen} options={{ gestureEnabled: false }}/>
        <Stack.Screen name='CategorySelection' component={CategorySelectionScreen} options={{ gestureEnabled: false }}/>
        <Stack.Screen name='Results' component={ResultsScreen} options={{ gestureEnabled: false }}/>
      </Stack.Navigator>
    </NavigationContainer>
  )
  // return <LoginScreen />
}