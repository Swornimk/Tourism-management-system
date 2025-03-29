import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Dimensions,
  Image,
  TouchableOpacity,
} from "react-native";
import { Destination } from "../config/data";

const screenWidth = Dimensions.get("screen").width;

export default function Home({ route }) {
  let products = [];
  switch (route.name) {
    case "Destination":
      products = Destination.slice().reverse();
      break;
    case "Profile":
      products = Destination.slice(4, 7);
      break;
    default:
      products = Destination;
      break;
  }
  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: "space-between", paddingTop: 5 }}
        renderItem={({ item, index }) => {
          return (
            <TouchableOpacity
              style={[styles.card, index % 2 === 1 && styles.drop]}
            >
              <Image source={item.img} style={styles.image} />
              <Text style={styles.title}>{item.name}</Text>
            </TouchableOpacity>
          );
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFCF8",
    paddingHorizontal: 20,
    paddingTop: 5,
  },
  card: {
    width: 0.5 * screenWidth - 30,
    marginBottom: 20,
  },
  image: {
    width: "100%",
    height: 0.5 * screenWidth,
    resizeMode: "cover",
    borderRadius: 30,
  },
  title: {
    fontWeight: "bold",
    fontSize: 15,
    paddingTop: 10,
    paddingBottom: 5,
    color: "#1A1A1A",
  },
  subTitle: {
    fontSize: 13,
    color: "#5A4E3A",
  },
  drop: {
    top: 10,
  },
});
