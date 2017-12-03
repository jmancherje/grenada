import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Map, List } from 'immutable';
import {
  View,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { MapView } from 'expo';
import {
  Text,
  List as NbList,
  Left,
  Body,
  Right,
  Button,
  ListItem,
  Footer,
  FooterTab,
  Container,
  Content,
} from 'native-base';
import Collapsible from 'react-native-collapsible';

import LocationSearch from './LocationSearch';
import WaypointListItem from './WaypointListItem';
import { metersToMiles } from '../helpers/conversions';
import Polyline from './Polyline';
import sharedStyles from './styles/sharedStyles';

// This type is just for reference
// eslint-disable-next-line no-unused-vars
type LocationObjectType = {
  coords: {
    latitude: number,
    longitude: number,
    altitude: number,
    accuracy: number,
    altitudeAccuracy: number,
    heading: number,
    speed: number,
  },
  timestamp: number,
};

// Based on average 5'8" person
// TODO: customize this for all users
const STEPS_PER_METER = 0.713;

const { width: deviceWidth, height: deviceHeight } = Dimensions.get('window');
const mapWidth = deviceWidth;
const mapHeight = Math.round(deviceHeight / 3);
const aspectRatio = mapWidth / mapHeight;
const LATITUDE_DELTA = 0.0012299763249572493;
const LONGITUDE_DELTA = LATITUDE_DELTA * aspectRatio;

const mapRegion = {
  latitudeDelta: LATITUDE_DELTA,
  longitudeDelta: LONGITUDE_DELTA,
};
export default class Directions extends Component {
  static navigationOptions = {
    title: 'Create a New Route',
  };
  static propTypes = {
    currentStepCount: PropTypes.number.isRequired,
    resetCurrentStepCount: PropTypes.func.isRequired,
    updateActiveIndex: PropTypes.func.isRequired,
    clearDestinationIndex: PropTypes.func.isRequired,
    activeRouteIndex: PropTypes.number.isRequired,
    searchedRouteOptions: PropTypes.instanceOf(List).isRequired,
    updateDestinations: PropTypes.func.isRequired,
    addCurrentLocationToDestinations: PropTypes.func.isRequired,
    destinations: PropTypes.instanceOf(List).isRequired,
    currentLocation: PropTypes.instanceOf(Map).isRequired,
    numberOfDestinations: PropTypes.number.isRequired,
    resetDirections: PropTypes.func.isRequired,
    navigation: PropTypes.object.isRequired, // eslint-disable-line
  };

  state = {
    isShowingRoute: true,
    isShowingMap: false,
    isShowingDistance: false,
    isShowingSteps: true,
    active: false,
  };

  componentWillReceiveProps(nextProps) {
    if (nextProps.searchedRouteOptions.size && nextProps.searchedRouteOptions !== this.props.searchedRouteOptions) {
      this.fitMap(nextProps.searchedRouteOptions.getIn([0, 'steps']));
    }

    if (this.props.destinations.size === 1 && nextProps.destinations.size === 2) {
      this.setState({
        isShowingRoute: true,
        isShowingMap: true,
        isShowingDistance: true,
        isShowingSteps: true,
        isShowingSave: false,
      });
    }
  }

  navigateToSave = () => {
    this.props.navigation.navigate('SaveForm');
  };

  toggleRoute = () => {
    this.setState({ isShowingRoute: !this.state.isShowingRoute });
  };

  toggleMap = () => {
    this.setState({ isShowingMap: !this.state.isShowingMap });
  };

  toggleDistance = () => {
    this.setState({ isShowingDistance: !this.state.isShowingDistance });
  };

  toggleSteps = () => {
    this.setState({ isShowingSteps: !this.state.isShowingSteps });
  };

  toggleSave = () => {
    this.setState({ isShowingSave: !this.state.isShowingSave });
  };

  setMapRef = (ref) => {
    this.map = ref;
  };

  fitMap = (steps) => {
    if (List.isList(steps)) {
      steps = steps.toJS();
    }
    // NOTE this is expecting an array of objects, not a list of maps
    if (!this.map || steps.length < 2) return;
    this.map.fitToCoordinates(steps, {
      edgePadding: { top: 15, right: 15, bottom: 15, left: 15 },
      animated: true,
    });
  };

  getPolylines = () => {
    const {
      searchedRouteOptions,
      activeRouteIndex,
      updateActiveIndex,
    } = this.props;
    if (!searchedRouteOptions) return null;

    return searchedRouteOptions.map((route, idx) => (
      <Polyline
        key={ route.get('distance') }
        steps={ route.get('steps', List()).toJS() }
        index={ idx }
        activeIndex={ activeRouteIndex }
        onPress={ updateActiveIndex }
      />
    ));
  };

  renderMap = () => {
    const {
      destinations,
      searchedRouteOptions,
      activeRouteIndex,
      currentLocation,
    } = this.props;
    const lastDestination = destinations.last() || Map();
    let longitude = lastDestination.getIn(['coordinates', 'longitude']);
    let latitude = lastDestination.getIn(['coordinates', 'latitude']);
    // Center map on the current location if it's opened
    // When the user hasn't input any destinations
    if (!longitude || !latitude) {
      longitude = currentLocation.get('longitude');
      latitude = currentLocation.get('latitude');
    }
    if (!longitude || !latitude) return null;
    const region = {
      // TODO: calculate the deltas using the viewport data with ...mapRegion as a fallback
      ...mapRegion,
      longitude,
      latitude,
    };
    const activeRoute = searchedRouteOptions.get(activeRouteIndex, Map());
    const activeSteps = activeRoute.get('steps', List());
    return (
      <View
        style={ styles.mapDimensions }
      >
        <MapView
          ref={ this.setMapRef }
          style={ { width: '100%', height: '100%' } }
          initialRegion={ region }
        >
          <MapView.Marker
            coordinate={ { latitude, longitude } }
            title="Current Location"
          >
            <View
              style={ styles.mapMarker }
            />
          </MapView.Marker>
          { activeSteps.size ? this.getPolylines() : null }
        </MapView>
      </View>
    );
  };

  render() {
    const {
      activeRouteIndex,
      searchedRouteOptions,
      destinations,
      clearDestinationIndex,
      resetDirections,
      numberOfDestinations,
    } = this.props;
    if (!searchedRouteOptions) return null;
    // const hasCurrentLocation = destinations.some(dest => dest.get('name') === 'Current Location');
    const activeRoute = searchedRouteOptions.get(activeRouteIndex, Map());
    return (
      <Container>
        <Content>
          <View style={ styles.device }>
            <NbList>
              <ListItem style={ [sharedStyles.listStackCorrection, { marginLeft: 0 }] }>
                <Left>
                  <Text>Walking Route</Text>
                </Left>
                { !numberOfDestinations ? (
                  <Body>
                    <Text>Add a starting point</Text>
                  </Body>
                ) : (
                  <Right>
                    <Button small onPress={ resetDirections }>
                      <Text>Reset</Text>
                    </Button>
                  </Right>
                ) }

              </ListItem>
              <View>
                { destinations.size ? (
                  destinations.map((destination, index) => (
                    <WaypointListItem
                      key={ destination.get('dataPlaceId') || `key_${index}` }
                      clearDestinationIndex={ clearDestinationIndex }
                      destination={ destination }
                      index={ index }
                    />
                  ))
                ) : null }
                <LocationSearch
                  handleSelectLocation={ this.props.updateDestinations }
                  leftButtonText={ destinations.size ? 'Add Destination' : 'Starting Point' }
                  hasCurrentLocation // Currently hard coding to true so we can use the button below
                  addCurrentLocationToDestinations={ this.props.addCurrentLocationToDestinations }
                />
              </View>
              <ListItem
                itemDivider
                style={ [sharedStyles.listStackCorrection, styles.header] }
                onPress={ this.toggleMap }
              >
                <Left>
                  <Text>Map</Text>
                </Left>
                <Right>
                  <Text style={ styles.expandButton }>{ this.state.isShowingMap ? 'v' : '>' }</Text>
                </Right>
              </ListItem>
              <Collapsible collapsed={ !this.state.isShowingMap }>
                { this.renderMap() }
              </Collapsible>
              <ListItem
                itemDivider
                style={ [sharedStyles.listStackCorrection, styles.header] }
                onPress={ this.toggleDistance }
              >
                <Left>
                  <Text>Distance and Estimated Steps</Text>
                </Left>
                <Right>
                  <Text style={ styles.expandButton }>{ this.state.isShowingDistance ? 'v' : '>' }</Text>
                </Right>
              </ListItem>
              <Collapsible collapsed={ !this.state.isShowingDistance }>
                <ListItem style={ sharedStyles.listStackCorrection }>
                  { activeRoute.get('distance') ? (
                    <Text>{ `${Math.round(activeRoute.get('distance') / STEPS_PER_METER)} steps (for ${metersToMiles(activeRoute.get('distance')).toFixed(2)} miles)` }</Text>
                  ) : (
                    <Text style={ styles.smallText }>Add destinations to get your route and estimated steps</Text>
                  ) }
                </ListItem>
              </Collapsible>
              <ListItem
                itemDivider
                style={ [sharedStyles.listStackCorrection, styles.header] }
                onPress={ this.toggleSteps }
              >
                <Left>
                  <Text>Current Step Count</Text>
                </Left>
                <Right>
                  <Text style={ styles.expandButton }>{ this.state.isShowingSteps ? 'v' : '>' }</Text>
                </Right>
              </ListItem>
              <Collapsible collapsed={ !this.state.isShowingSteps }>
                <ListItem style={ [sharedStyles.listStackCorrection, styles.listItem] }>
                  <Left>
                    <Text style={ styles.stepText }>Total Steps: { this.props.currentStepCount }</Text>
                  </Left>
                  <Right>
                    <Button
                      small
                      transparent
                      onPress={ this.props.resetCurrentStepCount }
                    >
                      <Text>Reset</Text>
                    </Button>
                  </Right>
                </ListItem>
              </Collapsible>
            </NbList>
          </View>
        </Content>
        <Footer>
          <FooterTab>
            <Button
              full
              disabled={ numberOfDestinations < 2 }
              danger={ numberOfDestinations < 2 }
              success={ numberOfDestinations >= 2 }
              onPress={ numberOfDestinations >= 2 ? this.navigateToSave : null }
            >
              <Text style={ styles.saveButton }>
                { numberOfDestinations < 2 ? 'Add Destinations to your Route to Save' : 'Save Route' }
              </Text>
            </Button>
          </FooterTab>
        </Footer>
      </Container>
    );
  }
}

const styles = StyleSheet.create({
  device: {
    width: deviceWidth,
  },
  mapDimensions: {
    width: mapWidth,
    height: mapHeight,
  },
  mapMarker: {
    backgroundColor: 'blue',
    height: 10,
    width: 10,
    borderRadius: 5,
  },
  listDividerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listDivider: {
    height: 30,
  },
  itemHeader: {
    height: 30,
  },
  listItem: {
    marginLeft: 0,
    paddingLeft: 10,
  },
  stepText: {
    marginLeft: 0,
  },
  header: {
    backgroundColor: '#dddddd',
    borderBottomWidth: 1,
    borderBottomColor: '#bfbfbf',
    height: 40,
    marginLeft: 0,
    paddingLeft: 10,
  },
  smallText: {
    fontSize: 13,
    color: '#8c8c8c',
  },
  expandButton: {
    fontSize: 16,
  },
  saveButton: {
    color: 'white',
    fontSize: 17,
  },
});
