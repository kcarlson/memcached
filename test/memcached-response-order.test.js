'use strict';

/**
 * Test dependencies
 */
var assert = require('assert')
  , fs = require('fs')
  , common = require('./common')
  , Memcached = require('../')
  , net = require('net');

global.testnumbers = global.testnumbers || +(Math.random(10) * 1000000).toFixed();

describe('Requiring a specific callback order', function () {
  var server;

  function handleClientSocketData ( clientSocket, address ) {
    return function( data ) {
      var req = data.toString( 'utf8' ),
          parts = req.split( ' ');

      if ( req.indexOf( 'get' ) === 0 ) {
        setTimeout( function() {
          clientSocket.write( 'VALUE ' + parts[ 1 ].replace( '\r\n', '' ) + ' 0 1\r\n9\r\nEND\r\n', 'utf8' );
        }, 1000 );
      }
      else if ( req.indexOf( 'set' ) === 0 ) {
        clientSocket.write( 'STORED\r\n', 'utf8' );
      }
      else {
        throw new Error( 'Bad request: ' + req );
      }
    };
  };

  before( function( done ) {
    server = net.createServer( function( sock ) {
      sock.on( 'data', handleClientSocketData( sock, server.address() ) );
    } )
    .listen( done )
    .on( 'error', done );
  } );

  after( function( done ) {
    server.close( done );
  } );

  it( 'should invoke the correct callback', function ( done ) {
    this.timeout( 10000 );
    var memcached = new Memcached( '127.0.0.1:' + server.address().port, { debug: true, poolSize: 1 } )
        , testnr = ++global.testnumbers
        , callbacks = 0;

      for( var i=0;i<1000;i++ ) {
        memcached.get( 'test:' + testnr, function( err, data ) {
          assert.equal( data, 9 )
          if ( i === 999 ) {
              done();
          }
        } );
        memcached.set('test:' + testnr, 9, 1000, function ( err, ok ) {
          assert.equal( ok, true );
          if ( i === 999 ) {
              done();
          }
        } );
      }
  } );
} );
