import { connect } from 'react-redux';

import {
  saveRoute,
} from '../actions/directions';

import SaveRouteForm from '../components/SaveRouteForm';

export default connect(null, {
  saveRoute,
})(SaveRouteForm);