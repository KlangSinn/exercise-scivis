#ifndef CUBE_HPP
#define CUBE_HPP

// -----------------------------------------------------------------------------
// Copyright  : (C) 2014 Andreas-C. Bernstein
// License    : MIT (see the file LICENSE)
// Maintainer : Andreas-C. Bernstein <andreas.bernstein@uni-weimar.de>
// Stability  : experimental
//
// Cube
// -----------------------------------------------------------------------------

#define GLM_FORCE_RADIANS
#include <glm/vec2.hpp>
#include <glm/vec3.hpp>

class Cube
{
public:
  struct Vertex
  {
      Vertex(){
          position = glm::vec3(0.0, 0.0, 0.0);
          texCoord = glm::vec2(0.0, 0.0);
      };

	  Vertex(glm::vec3 in_position, glm::vec2 in_texCoord){
		position = in_position;
		texCoord = in_texCoord;
	  };

    glm::vec3 position;
    glm::vec2 texCoord;
  };

  Cube();
  Cube(glm::vec3 min, glm::vec3 max);
  void draw() const;

private:
  unsigned int m_vao;
};

#endif // CUBE_HPP
