import { StyleSheet, Text, View, TouchableOpacity, StatusBar, ImageBackground, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { tabOptions } from '../constants/categories';
import { ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAccessToken } from '../services/SpotifyAuth';

const options = ['Vibe', 'Genre', 'Year', 'Artist'];



export default function CategorySelection({ navigation }) {

    // sets default to vibe option
    const [selected, setSelected] = useState('Vibe');

    // for toggling options
    const [selectedOptions, setSelectedOptions] = useState([]);

    // for displaying certain artists
    const [artists, setArtists] = useState([]);

    // for now, handles displaying artists
    useEffect(() => {
        async function fetchArtists() {
            try {
                const token = await getAccessToken();
                // may need to change url depending on server
                const response = await fetch('http://10.13.229.136:5001/spotify/artists', {
                    headers: { Authorization:   `Bearer ${token}` }
                });
                const data = await response.json();
                console.log('First artist:', JSON.stringify(data.artists[0]));
                setArtists(data.artists);
            } catch (err) {
                console.log('Error fetching artists:', err.message);
            }
        }
        fetchArtists();
    }, []);

    // toggles options
    const toggleOption = (name) => {
        setSelectedOptions(prev =>
            prev.includes(name) ? prev.filter(o => o !== name) : [...prev, name]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.top}>
                <TouchableOpacity style={styles.goBackArrow} onPress={() => navigation.navigate('Home')}>
                    <MaterialIcons name="arrow-back-ios" size={26} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.title}>Create Your Mix</Text>
                {/* <View style={{ width: 28 + 16 }} /> */}
                {selectedOptions.length > 0 ? (
                    <TouchableOpacity style={styles.clearOption} onPress={() => setSelectedOptions([])}>
                        <Text style={styles.clearOptionText}>CLEAR</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.clearOption} />
                )}
            </View>
            <View style={styles.tabBar}>
                {options.map((option) => (
                    <TouchableOpacity
                        key={option}
                        onPress={() => setSelected(option)}
                        style={[styles.tab, selected === option && styles.activeTab]}
                    >
                        <Text style={[styles.tabText, selected === option && styles.activeTabText]}>
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <ScrollView style={{ width: '100%' }} contentContainerStyle={{ alignItems: 'center', paddingBottom: 100 }}>
            {/* Vibe card */}
            {selected === 'Vibe' && (
                <View style={styles.vibeView}>
                    <View style={styles.grid}>
                        {tabOptions.Vibe.map((option) => {
                            const isSelected = selectedOptions.includes(option.name);

                            return (
                                <TouchableOpacity
                                    key={option.name}
                                    onPress={() => toggleOption(option.name)}
                                    style={[
                                        styles.vibeCard,
                                        !option.image && { backgroundColor: option.color },
                                        isSelected && styles.selectedVibeCard
                                    ]}
                                >
                                    {option.image ? (
                                        <ImageBackground
                                            source={option.image}
                                            style={styles.vibeBackground}
                                            imageStyle={styles.vibeBackgroundImage}
                                        >
                                            <View style={styles.vibeImageShade} />
                                            <Text style={styles.vibeText}>{option.name}</Text>
                                        </ImageBackground>
                                    ) : (
                                        <Text style={styles.vibeText}>{option.name}</Text>
                                    )}

                                    {isSelected ? (
                                        <View style={styles.vibeSelectedBadge}>
                                            <MaterialIcons name="check-circle" size={22} color="#1DB954" />
                                        </View>
                                    ) : null}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            )}
            {/* Genre card */}
            {selected === 'Genre' && (
                <View style={styles.genreView}>
                    <View style={styles.genreGrid}>
                        {tabOptions.Genre.map((option) => (
                            <TouchableOpacity
                                key={option.name}
                                onPress={() => toggleOption(option.name)}
                                style={[
                                    styles.genreCard,
                                    { backgroundColor: option.color },
                                    selectedOptions.includes(option.name) && styles.selectedGenreCard
                                ]}
                            >
                                <Text style={[styles.genreText, selectedOptions.includes(option.name) && styles.selectedGenreText]}>{option.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}
            {/* Year card */}
            {selected === 'Year' && (
                <View style={styles.yearView}>
                    <Text style={styles.yearLabel}>BY DECADE</Text>
                    <View style={styles.grid}>
                        {tabOptions.Year.Decades.map((option) => (
                            <TouchableOpacity
                                key={option}
                                onPress={() => toggleOption(option)}
                                style={[
                                    styles.yearCard,
                                    selectedOptions.includes(option) && styles.selectedYearCard
                                ]}
                            >
                                <Text style={[styles.yearCardText, selectedOptions.includes(option) && styles.selectedYearText]}>{option}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.yearLabel}>ICONIC YEARS</Text>
                    <View style={styles.grid}>
                        {tabOptions.Year.Iconic.map((option) => (
                            <TouchableOpacity
                                key={option}
                                onPress={() => toggleOption(option)}
                                style={[
                                    styles.yearCard,
                                    selectedOptions.includes(option) && styles.selectedYearCard
                                ]}
                            >
                                <Text style={[styles.yearCardText, selectedOptions.includes(option) && styles.selectedYearText]}>{option}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}
            {/* Artist Card */}
            {selected === 'Artist' && (
                <View style={styles.artistView}>
                    <View style={styles.grid}>
                        {artists.map((artist) => (
                            <TouchableOpacity
                                key={artist.name}
                                onPress={() => toggleOption(artist.name)}
                                style={styles.artistLayout}
                            >
                                {artist.image ? (
                                    <Image source={{ uri: artist.image }} style={[styles.artistCard, selectedOptions.includes(artist.name) &&
                                        styles.selectedArtist]} />
                                ) : (
                                    <View style={[styles.artistCard, styles.artistPlaceholder, selectedOptions.includes(artist.name) && styles.selectedArtist]}>
                                        <MaterialIcons name='music-note' size={28} color="#939191" />
                                    </View>
                                )}
                                <Text style={[styles.artistText, selectedOptions.includes(artist.name) && styles.selectedArtistText]}>{artist.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}
            </ScrollView>
            <LinearGradient
                colors={['rgba(13, 13, 13, 0)', '#0d0d0d']}
                style={styles.bottom}
            >
                <View style={styles.filtersTextView}>
                    <Text style={styles.filtersText}>{selectedOptions.length} filters selected</Text>
                </View>
                <View style={[styles.generateButton, selectedOptions.length === 0 && styles.generateDisabled]}>
                        <TouchableOpacity style={[styles.genButton, selectedOptions.length === 0 && styles.generateDisabled]}
                            disabled={selectedOptions.length === 0}
                            onPress={() =>
                                navigation.navigate('Results', {
                                    category: selected,
                                    filters: selectedOptions,
                            })
                        }
                        >
                            <FontAwesome6 name="wand-magic-sparkles" size={21} color="#000000" style={{ marginRight: 6}}/>
                            <Text style={styles.generateText}>Generate Combined Mix</Text>
                        </TouchableOpacity>
                    </View>      
            </LinearGradient>
        <StatusBar style='light' />
        </SafeAreaView>

    );
}

const styles = StyleSheet.create({
    // CREATE YOUR MIX AND BACK ARROW
    top: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    container: {
        flex: 1,
        backgroundColor: '#0d0d0d',
        alignItems: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 19,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
    },
    goBackArrow: {
        marginLeft: 17,
        width: 55,
    },
    clearOption: {
        marginRight: 17,
        width: 55,
        alignItems: 'flex-end',
    },
    clearOptionText: {
        color: '#797878',
        fontWeight: 'bold',
    },
    // TABS
    tabBar: {
        backgroundColor: '#161515',
        flexDirection: 'row',
        width: '90%',
        borderRadius: 10,
        marginTop: 22,
        marginBottom: 10,

    },
    tab: {
        flex: 1,
        alignItems: 'center',
    },
    tabText: {
        padding: 15,
        textAlign: 'center',
        color: '#797878',
        fontSize: 16,
    },
    activeTab: {
        backgroundColor: '#1DB954',
        borderRadius: 10,
    },
    activeTabText: {
        color: '#000000',
    },
    // GENERATE BUTTON
    generateButton: {
        backgroundColor: '#1DB954',
        borderRadius: 30,
        // width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        padding: 25,
    },
    generateText: {
        fontSize: 21,
    },
    genButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    generateDisabled: {
        backgroundColor: '#158a3e',
    },
    // GENERAL CARD GRID
    grid: {
        flexDirection:'row',
        flexWrap: 'wrap',
        width: '100%',
    }, 
    genreGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: '100%',
        justifyContent: 'flex-start',

    },
    // VIBE CARD
    vibeText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 21,
        textAlign: 'center',
    },
    vibeView: {
        width: '93%',
        alignItems: 'center',
        marginTop: 10,
    },
    vibeCard: {
        backgroundColor: '#1DB954',
        height: 180,
        width: '45%',
        margin: '2%',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    vibeBackground: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    vibeBackgroundImage: {
        borderRadius: 10,
    },
    vibeImageShade: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.18)',
    },
    selectedVibeCard: {
        shadowColor: '#1DB954',
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
    vibeSelectedBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.45)',
        borderRadius: 999,
    },
    // GENRE CARD
    genreText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 19,
        marginTop: 5
    },
    genreView: {
        width: '93%',
        alignItems: 'center',
        marginTop: 10,
    },
    genreCard: {
        backgroundColor: '#1DB954',
        width: 40,
        height: 90,
        padding: 10,
        width: '45%',
        margin: '2%',
        borderRadius: 10
    },
    selectedGenreCard: {
        borderWidth: 3,
        borderColor: '#ffffff',
    },
    // YEAR MAPPING
    yearLabel: {
        color: '#797878',
        padding: 10,
        fontSize: 16,
    },
    yearView: {
        width: '90%',
        marginTop: 10,
    }, 
    yearCard: {
        backgroundColor: '#161515',
        padding: 18,
        borderRadius: 7,
        width: '30%',
        margin: '1.5%',
        alignItems: 'center',
        borderWidth: .2,
        borderColor: '#4f4c4c',
    },
    yearCardText: {
        color: '#939191',
        fontSize: 15,
    },
    selectedYearCard: {
        backgroundColor: '#1DB954',
    },
    selectedYearText: {
        color: '#000000'
    },
    // ARTISTS MAPPING
    artistView: {
        marginTop: 10,
    },
    artistText: {
        color: '#939191',
        textAlign: 'center',
        fontSize: 15,
        marginTop: 8,
    },
    artistCard: {
        backgroundColor: '#1DB954',
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    artistLayout: {
        alignItems: 'center',
        width: '33%',
        marginBottom: 15,
        padding: 4,
    },
    selectedArtist: {
        borderWidth: 3,
        borderColor: '#1DB954',
    },
    selectedArtistText: {
        color: '#1DB954',
    },
    filtersText: {
        color: '#bdbaba',
        alignSelf: 'flex-start',
        marginLeft: '5%',
        marginBottom: 8,
    },
    bottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 80,
        paddingHorizontal: '5%',
        paddingBottom: 20,
    },
    artistPlaceholder: {
        backgroundColor: '#161515',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
